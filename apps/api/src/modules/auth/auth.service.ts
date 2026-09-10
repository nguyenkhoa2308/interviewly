import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { StringValue } from 'ms';
import { createHash, randomBytes, randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashValue, verifyHash } from './utils/hash.util';
import { calculateTokenExpiration } from './utils/token.util';
import { AUTH_ERROR_CODE } from './constants/auth-error-code.constant';
import { generateOtp, hashOtp, verifyOtp } from '../../common/utils/otp.util';
import { MailService } from '../mail/mail.service';
import { OAuthProvider } from '../../generated/prisma/enums';
import { GoogleProfile } from './strategies/google.strategy';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
    ) {}

    private readonly logger = new Logger(AuthService.name);
    private readonly passwordResetLifetimeMs = 30 * 60 * 1000;

    private hashResetToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private throwResetTokenError(
        token: {
            usedAt: Date | null;
            expiresAt: Date;
        } | null,
    ): never {
        if (!token) {
            throw new BadRequestException({
                code: AUTH_ERROR_CODE.INVALID_RESET_TOKEN,
                message: 'Liên kết đặt lại mật khẩu không hợp lệ.',
            });
        }

        if (token.usedAt) {
            throw new BadRequestException({
                code: AUTH_ERROR_CODE.RESET_TOKEN_USED,
                message: 'Liên kết đặt lại mật khẩu này đã được sử dụng.',
            });
        }

        if (token.expiresAt <= new Date()) {
            throw new BadRequestException({
                code: AUTH_ERROR_CODE.RESET_TOKEN_EXPIRED,
                message:
                    'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.',
            });
        }

        throw new BadRequestException({
            code: AUTH_ERROR_CODE.INVALID_RESET_TOKEN,
            message: 'Liên kết đặt lại mật khẩu không hợp lệ.',
        });
    }

    private async generateTokens(
        user: {
            id: string;
            email: string;
            role: string;
        },
        sessionId: string,
    ) {
        const accessToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                sid: sessionId,
                role: user.role,
            },
            {
                secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
                expiresIn: this.configService.getOrThrow(
                    'JWT_ACCESS_EXPIRES_IN',
                ) as StringValue,
            },
        );

        const refreshToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                sid: sessionId,
                jti: randomUUID(),
            },
            {
                secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.getOrThrow(
                    'JWT_REFRESH_EXPIRES_IN',
                ) as StringValue,
            },
        );

        return {
            accessToken,
            refreshToken,
        };
    }

    private async createSession(
        user: {
            id: string;
            email: string;
            role: string;
        },
        userAgent?: string,
        ipAddress?: string,
    ) {
        const sessionId = randomUUID();

        const { accessToken, refreshToken } = await this.generateTokens(
            user,
            sessionId,
        );

        const refreshTokenHash = await hashValue(refreshToken);

        const expiresAt = calculateTokenExpiration(
            this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
        );

        const session = await this.prisma.session.create({
            data: {
                id: sessionId,
                userId: user.id,
                refreshTokenHash,
                userAgent,
                ipAddress,
                expiresAt,
            },
        });

        return {
            session,
            accessToken,
            refreshToken,
        };
    }

    private async createEmailVerification(userId: string) {
        const otp = generateOtp();
        const otpHash = await hashOtp(otp);

        const verification = await this.prisma.emailVerification.create({
            data: {
                userId,
                codeHash: otpHash,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });

        return {
            otp,
            verification,
        };
    }

    async register(dto: RegisterDto) {
        const email = dto.email.trim().toLowerCase();

        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException({
                code: AUTH_ERROR_CODE.EMAIL_ALREADY_USED,
                message: 'Địa chỉ email này đã được sử dụng.',
            });
        }

        const passwordHash = await hashValue(dto.password);

        const user = await this.prisma.user.create({
            data: {
                fullName: dto.fullName.trim(),
                email,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                emailVerifiedAt: true,
                onboardingCompletedAt: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });

        const { otp } = await this.createEmailVerification(user.id);

        try {
            await this.mailService.sendVerificationOtp(user.email, otp);
        } catch (error) {
            this.logger.error(
                `Failed to send verification email to ${user.email}`,
                error,
            );
        }

        return user;
    }

    async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
        const email = dto.email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: {
                email,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                passwordHash: true,
                emailVerifiedAt: true,
                onboardingCompletedAt: true,
                role: true,
                status: true,
            },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.INVALID_CREDENTIALS,
                message: 'Thông tin đăng nhập không chính xác.',
            });
        }

        const isPasswordValid = await verifyHash(
            user.passwordHash,
            dto.password,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.INVALID_CREDENTIALS,
                message: 'Thông tin đăng nhập không chính xác.',
            });
        }

        if (!user.emailVerifiedAt) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.EMAIL_NOT_VERIFIED,
                message: 'Tài khoản chưa được xác thực email.',
            });
        }

        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.ACCOUNT_INACTIVE,
                message: 'Tài khoản đã bị khóa hoặc vô hiệu hóa.',
            });
        }

        const { accessToken, refreshToken } = await this.createSession(
            {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            userAgent,
            ipAddress,
        );

        const { passwordHash: _passwordHash, ...safeUser } = user;

        return {
            user: safeUser,
            accessToken,
            refreshToken,
        };
    }

    async refresh(refreshToken: string) {
        let payload: {
            sub: string;
            sid: string;
        };

        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.getOrThrow<string>(
                    'JWT_REFRESH_SECRET',
                ),
            });
        } catch {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.INVALID_SESSION,
                message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ.',
            });
        }

        const session = await this.prisma.session.findUnique({
            where: {
                id: payload.sid,
            },
            include: {
                user: true,
            },
        });

        if (
            !session ||
            session.userId !== payload.sub ||
            session.revokedAt ||
            session.expiresAt <= new Date()
        ) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.INVALID_SESSION,
                message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ.',
            });
        }

        const isValidToken = await verifyHash(
            session.refreshTokenHash,
            refreshToken,
        );

        if (!isValidToken) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.INVALID_SESSION,
                message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ.',
            });
        }

        if (session.user.status !== 'ACTIVE') {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.ACCOUNT_INACTIVE,
                message: 'Tài khoản đã bị khóa hoặc vô hiệu hóa.',
            });
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await this.generateTokens(
                {
                    id: session.user.id,
                    email: session.user.email,
                    role: session.user.role,
                },
                session.id,
            );

        const newRefreshTokenHash = await hashValue(newRefreshToken);

        const rotated = await this.prisma.session.updateMany({
            where: {
                id: session.id,
                userId: payload.sub,
                refreshTokenHash: session.refreshTokenHash,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            data: {
                refreshTokenHash: newRefreshTokenHash,
                lastUsedAt: new Date(),
            },
        });

        if (rotated.count !== 1) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.INVALID_SESSION,
                message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ.',
            });
        }

        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    }

    async logout(refreshToken?: string) {
        if (!refreshToken) {
            return;
        }

        try {
            const payload = await this.jwtService.verifyAsync<{
                sub: string;
                sid: string;
            }>(refreshToken, {
                secret: this.configService.getOrThrow<string>(
                    'JWT_REFRESH_SECRET',
                ),
            });

            await this.prisma.session.updateMany({
                where: {
                    id: payload.sid,
                    userId: payload.sub,
                    revokedAt: null,
                },
                data: {
                    revokedAt: new Date(),
                },
            });
        } catch {
            return;
        }
    }

    async forgotPassword(email: string) {
        const publicResult = {
            message:
                'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
        };
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                status: 'ACTIVE',
                deletedAt: null,
            },
            select: { id: true, email: true },
        });

        if (!user) {
            return publicResult;
        }

        const now = new Date();
        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = this.hashResetToken(rawToken);

        await this.prisma.$transaction([
            this.prisma.passwordResetToken.updateMany({
                where: {
                    userId: user.id,
                    usedAt: null,
                    expiresAt: { gt: now },
                },
                data: { usedAt: now },
            }),
            this.prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt: new Date(
                        now.getTime() + this.passwordResetLifetimeMs,
                    ),
                },
            }),
        ]);

        const frontendUrl = this.configService
            .getOrThrow<string>('FRONTEND_URL')
            .replace(/\/$/, '');
        const resetUrl =
            frontendUrl +
            '/reset-password?token=' +
            encodeURIComponent(rawToken);

        try {
            await this.mailService.sendPasswordReset(user.email, resetUrl);
        } catch (error) {
            this.logger.error(
                'Failed to send password reset email to ' + user.email,
                error,
            );
        }

        return publicResult;
    }

    async validateResetToken(rawToken: string) {
        const token = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash: this.hashResetToken(rawToken) },
            select: {
                expiresAt: true,
                usedAt: true,
                user: { select: { status: true, deletedAt: true } },
            },
        });

        if (
            !token ||
            token.usedAt ||
            token.expiresAt <= new Date() ||
            token.user.status !== 'ACTIVE' ||
            token.user.deletedAt
        ) {
            this.throwResetTokenError(token);
        }

        return { valid: true };
    }

    async resetPassword(rawToken: string, password: string) {
        const tokenHash = this.hashResetToken(rawToken);
        const existingToken = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            select: {
                expiresAt: true,
                usedAt: true,
                user: { select: { status: true, deletedAt: true } },
            },
        });

        if (
            !existingToken ||
            existingToken.usedAt ||
            existingToken.expiresAt <= new Date() ||
            existingToken.user.status !== 'ACTIVE' ||
            existingToken.user.deletedAt
        ) {
            this.throwResetTokenError(existingToken);
        }

        const passwordHash = await hashValue(password);

        await this.prisma.$transaction(async (tx) => {
            const token = await tx.passwordResetToken.findUnique({
                where: { tokenHash },
                select: {
                    id: true,
                    userId: true,
                    expiresAt: true,
                    usedAt: true,
                    user: { select: { status: true, deletedAt: true } },
                },
            });

            if (
                !token ||
                token.usedAt ||
                token.expiresAt <= new Date() ||
                token.user.status !== 'ACTIVE' ||
                token.user.deletedAt
            ) {
                this.throwResetTokenError(token);
            }

            const now = new Date();
            const consumed = await tx.passwordResetToken.updateMany({
                where: {
                    id: token.id,
                    usedAt: null,
                    expiresAt: { gt: now },
                },
                data: { usedAt: now },
            });

            if (consumed.count !== 1) {
                throw new BadRequestException({
                    code: AUTH_ERROR_CODE.RESET_TOKEN_USED,
                    message: 'Liên kết đặt lại mật khẩu này đã được sử dụng.',
                });
            }

            await tx.user.update({
                where: { id: token.userId },
                data: { passwordHash },
            });
            await tx.passwordResetToken.updateMany({
                where: { userId: token.userId, usedAt: null },
                data: { usedAt: now },
            });
            await tx.session.updateMany({
                where: { userId: token.userId, revokedAt: null },
                data: { revokedAt: now },
            });
        });

        return {
            message: 'Mật khẩu của bạn đã được đặt lại thành công.',
        };
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                emailVerifiedAt: true,
                onboardingCompletedAt: true,
                role: true,
                status: true,
                createdAt: true,
                passwordHash: true,
                oauthAccounts: {
                    select: { provider: true },
                },
            },
        });

        if (!user || user.status !== 'ACTIVE') {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.USER_NOT_FOUND,
                message: 'Tài khoản không tồn tại hoặc không còn hoạt động.',
            });
        }

        const { passwordHash, oauthAccounts, ...safeUser } = user;

        return {
            ...safeUser,
            hasPassword: passwordHash !== null,
            connectedProviders: oauthAccounts.map(
                (account) => account.provider,
            ),
        };
    }

    async changePassword(
        userId: string,
        currentSessionId: string,
        dto: ChangePasswordDto,
    ) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, status: 'ACTIVE', deletedAt: null },
            select: { passwordHash: true },
        });

        if (!user?.passwordHash) {
            throw new BadRequestException({
                code: 'PASSWORD_NOT_CONFIGURED',
                message:
                    'Tài khoản này chưa có mật khẩu. Vui lòng sử dụng phương thức đăng nhập đã liên kết.',
            });
        }

        if (!(await verifyHash(user.passwordHash, dto.currentPassword))) {
            throw new BadRequestException({
                code: 'INVALID_CURRENT_PASSWORD',
                message: 'Mật khẩu hiện tại không chính xác.',
            });
        }

        if (await verifyHash(user.passwordHash, dto.newPassword)) {
            throw new BadRequestException({
                code: 'PASSWORD_UNCHANGED',
                message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
            });
        }

        const passwordHash = await hashValue(dto.newPassword);
        const now = new Date();

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: { passwordHash },
            }),
            this.prisma.session.updateMany({
                where: {
                    userId,
                    id: { not: currentSessionId },
                    revokedAt: null,
                },
                data: { revokedAt: now },
            }),
        ]);

        return {
            message:
                'Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được thu hồi.',
        };
    }

    async getSessions(userId: string, currentSessionId: string) {
        const sessions = await this.prisma.session.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                userAgent: true,
                ipAddress: true,
                createdAt: true,
                lastUsedAt: true,
                expiresAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return sessions.map((session) => ({
            ...session,
            isCurrent: session.id === currentSessionId,
        }));
    }

    async revokeSession(
        userId: string,
        currentSessionId: string,
        sessionId: string,
    ) {
        if (sessionId === currentSessionId) {
            throw new BadRequestException({
                code: 'CANNOT_REVOKE_CURRENT_SESSION',
                message:
                    'Không thể thu hồi phiên hiện tại tại đây. Hãy sử dụng chức năng đăng xuất.',
            });
        }

        const result = await this.prisma.session.updateMany({
            where: { id: sessionId, userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });

        if (result.count !== 1) {
            throw new BadRequestException({
                code: 'SESSION_NOT_FOUND',
                message: 'Phiên đăng nhập không tồn tại hoặc đã được thu hồi.',
            });
        }

        return { message: 'Đã đăng xuất thiết bị khỏi tài khoản.' };
    }

    async revokeOtherSessions(userId: string, currentSessionId: string) {
        const result = await this.prisma.session.updateMany({
            where: {
                userId,
                id: { not: currentSessionId },
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });

        return {
            message: `Đã đăng xuất ${result.count} phiên trên thiết bị khác.`,
            revokedCount: result.count,
        };
    }

    async deleteAccount(userId: string, dto: DeleteAccountDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true, status: true },
        });

        if (!user || user.status === 'DELETED') {
            throw new BadRequestException({
                code: 'ACCOUNT_ALREADY_DELETED',
                message: 'Tài khoản không tồn tại hoặc đã được xóa.',
            });
        }
        if (!user.passwordHash) {
            throw new BadRequestException({
                code: 'GOOGLE_REAUTH_REQUIRED',
                message:
                    'Tài khoản Google cần xác thực lại trước khi có thể xóa.',
            });
        }
        if (!(await verifyHash(user.passwordHash, dto.currentPassword))) {
            throw new BadRequestException({
                code: 'INVALID_CURRENT_PASSWORD',
                message: 'Mật khẩu hiện tại không chính xác.',
            });
        }

        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: { status: 'DELETED', deletedAt: now },
            }),
            this.prisma.session.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: now },
            }),
        ]);

        return { message: 'Tài khoản của bạn đã được xóa.' };
    }

    async verifyEmail(email: string, otp: string) {
        const normalizedEmail = email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
            throw new BadRequestException({
                code: 'INVALID_VERIFICATION_CODE',
                message: 'Mã xác minh không hợp lệ.',
            });
        }

        if (user.emailVerifiedAt) {
            throw new BadRequestException({
                code: 'EMAIL_ALREADY_VERIFIED',
                message: 'Địa chỉ email đã được xác minh.',
            });
        }

        const verification = await this.prisma.emailVerification.findFirst({
            where: {
                userId: user.id,
                usedAt: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!verification) {
            throw new BadRequestException({
                code: 'INVALID_VERIFICATION_CODE',
                message: 'Mã xác minh không hợp lệ.',
            });
        }

        if (verification.expiresAt <= new Date()) {
            throw new BadRequestException({
                code: 'VERIFICATION_CODE_EXPIRED',
                message: 'Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.',
            });
        }

        if (verification.attempts >= 5) {
            throw new BadRequestException({
                code: 'VERIFICATION_ATTEMPTS_EXCEEDED',
                message:
                    'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
            });
        }

        const isValid = await verifyOtp(verification.codeHash, otp);

        if (!isValid) {
            const updatedVerification =
                await this.prisma.emailVerification.update({
                    where: {
                        id: verification.id,
                    },
                    data: {
                        attempts: {
                            increment: 1,
                        },
                    },
                });

            if (updatedVerification.attempts >= 5) {
                throw new BadRequestException({
                    code: 'VERIFICATION_ATTEMPTS_EXCEEDED',
                    message:
                        'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
                });
            }

            throw new BadRequestException({
                code: 'INVALID_VERIFICATION_CODE',
                message: 'Mã xác minh không chính xác.',
            });
        }

        await this.prisma.$transaction(async (tx) => {
            const now = new Date();
            const consumed = await tx.emailVerification.updateMany({
                where: {
                    id: verification.id,
                    usedAt: null,
                    expiresAt: { gt: now },
                    attempts: { lt: 5 },
                },
                data: { usedAt: now },
            });

            if (consumed.count !== 1) {
                throw new BadRequestException({
                    code: 'INVALID_VERIFICATION_CODE',
                    message: 'Mã xác minh không hợp lệ.',
                });
            }

            await tx.user.update({
                where: { id: user.id },
                data: { emailVerifiedAt: now },
            });
        });

        return {
            message: 'Xác minh email thành công.',
        };
    }

    async resendVerification(email: string) {
        const normalizedEmail = email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
            throw new BadRequestException({
                code: 'USER_NOT_FOUND',
                message: 'Không tìm thấy tài khoản với địa chỉ email này.',
            });
        }

        if (user.emailVerifiedAt) {
            throw new BadRequestException({
                code: 'EMAIL_ALREADY_VERIFIED',
                message: 'Địa chỉ email đã được xác minh.',
            });
        }

        const latestVerification =
            await this.prisma.emailVerification.findFirst({
                where: {
                    userId: user.id,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

        if (latestVerification) {
            const resendAvailableAt =
                latestVerification.createdAt.getTime() + 60 * 1000;

            const remainingMs = resendAvailableAt - Date.now();

            if (remainingMs > 0) {
                throw new BadRequestException({
                    code: 'VERIFICATION_RESEND_TOO_SOON',
                    message: `Vui lòng chờ ${Math.ceil(remainingMs / 1000)} giây trước khi gửi lại mã.`,
                });
            }
        }

        await this.prisma.emailVerification.updateMany({
            where: {
                userId: user.id,
                usedAt: null,
            },
            data: {
                usedAt: new Date(),
            },
        });

        const { otp } = await this.createEmailVerification(user.id);

        try {
            await this.mailService.sendVerificationOtp(user.email, otp);
        } catch (error) {
            this.logger.error(
                `Failed to resend verification email to ${user.email}`,
                error,
            );
        }

        return {
            message: 'Mã xác minh mới đã được gửi.',
        };
    }

    async findOrCreateGoogleUser(profile: GoogleProfile) {
        if (!profile.emailVerified) {
            throw new UnauthorizedException({
                code: 'GOOGLE_EMAIL_NOT_VERIFIED',
                message: 'Email Google chưa được xác minh.',
            });
        }
        // 1. Google account này đã từng liên kết
        const existingOAuthAccount = await this.prisma.oAuthAccount.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: OAuthProvider.GOOGLE,
                    providerAccountId: profile.providerId,
                },
            },
            include: {
                user: true,
            },
        });

        if (existingOAuthAccount) {
            return existingOAuthAccount.user;
        }

        // 2. Chưa có OAuthAccount → kiểm tra email đã có User chưa
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: profile.email,
            },
        });

        if (existingUser) {
            if (existingUser.status !== 'ACTIVE') {
                throw new UnauthorizedException({
                    code: 'ACCOUNT_INACTIVE',
                    message: 'Tài khoản đã bị khóa hoặc vô hiệu hóa.',
                });
            }

            return this.prisma.$transaction(async (tx) => {
                await tx.oAuthAccount.create({
                    data: {
                        userId: existingUser.id,
                        provider: OAuthProvider.GOOGLE,
                        providerAccountId: profile.providerId,
                    },
                });

                if (!existingUser.emailVerifiedAt) {
                    return tx.user.update({
                        where: {
                            id: existingUser.id,
                        },
                        data: {
                            emailVerifiedAt: new Date(),
                        },
                    });
                }

                return existingUser;
            });
        }

        // 3. User hoàn toàn mới
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: profile.email,
                    fullName: profile.fullName,
                    avatarUrl: profile.avatarUrl,
                    emailVerifiedAt: new Date(),
                    passwordHash: null,
                },
            });

            await tx.oAuthAccount.create({
                data: {
                    userId: user.id,
                    provider: OAuthProvider.GOOGLE,
                    providerAccountId: profile.providerId,
                },
            });

            return user;
        });
    }

    async googleLogin(
        profile: GoogleProfile,
        userAgent?: string,
        ipAddress?: string,
    ) {
        const user = await this.findOrCreateGoogleUser(profile);

        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException({
                code: 'ACCOUNT_INACTIVE',
                message: 'Tài khoản hiện không thể đăng nhập.',
            });
        }

        const session = await this.createSession(user, userAgent, ipAddress);

        return {
            user,
            ...session,
        };
    }
}
