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
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashValue, verifyHash } from './utils/hash.util';
import { calculateTokenExpiration } from './utils/token.util';
import { AUTH_ERROR_CODE } from './constants/auth-error-code.constant';
import { generateOtp, hashOtp, verifyOtp } from '../common/utils/otp.util';
import { MailService } from '../modules/mail/mail.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
    ) {}

    private readonly logger = new Logger(AuthService.name);

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
                email: user.email,
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
                fullName: dto.fullName,
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

        const { passwordHash, ...safeUser } = user;

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
        } catch (error) {
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

        if (!session || session.revokedAt || session.expiresAt <= new Date()) {
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

        await this.prisma.session.update({
            where: {
                id: session.id,
            },
            data: {
                refreshTokenHash: newRefreshTokenHash,
                lastUsedAt: new Date(),
            },
        });

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
            },
        });

        if (!user) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.USER_NOT_FOUND,
                message: 'Tài khoản không tồn tại hoặc không còn hoạt động.',
            });
        }

        return user;
    }

    async verifyEmail(email: string, otp: string) {
        const normalizedEmail = email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
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

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerifiedAt: new Date(),
                },
            }),

            this.prisma.emailVerification.update({
                where: { id: verification.id },
                data: {
                    usedAt: new Date(),
                },
            }),
        ]);

        return {
            message: 'Xác minh email thành công.',
        };
    }

    async resendVerification(email: string) {
        const normalizedEmail = email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
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
}
