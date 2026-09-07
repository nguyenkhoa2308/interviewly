import type { Response, Request } from 'express';
import {
    Body,
    Controller,
    Req,
    Post,
    Res,
    UnauthorizedException,
    Get,
    Query,
    UseGuards,
    UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';
import { clearAuthCookies, setAuthCookies } from './utils/cookie.util';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './types/auth-user.type';
import { GoogleProfile } from './strategies/google.strategy';
import { GoogleAuthExceptionFilter } from './filters/google-auth-exception.filter';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {}

    private setAuthCookies(
        res: Response,
        accessToken: string,
        refreshToken: string,
    ) {
        setAuthCookies(res, accessToken, refreshToken, {
            isProduction:
                this.configService.get<string>('NODE_ENV') === 'production',

            accessExpiresIn: this.configService.getOrThrow<string>(
                'JWT_ACCESS_EXPIRES_IN',
            ),

            refreshExpiresIn: this.configService.getOrThrow<string>(
                'JWT_REFRESH_EXPIRES_IN',
            ),
        });
    }

    @Post('register')
    @ApiOperation({
        summary: 'Đăng ký tài khoản',
        description:
            'Tạo tài khoản mới bằng email và mật khẩu, sau đó gửi mã xác minh email.',
    })
    @ApiResponse({ status: 201, description: 'Đăng ký thành công.' })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu không hợp lệ hoặc email đã được sử dụng.',
    })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @ApiOperation({
        summary: 'Đăng nhập',
        description:
            'Xác thực bằng email và mật khẩu, sau đó lưu access token và refresh token vào HttpOnly cookie.',
    })
    @ApiResponse({ status: 200, description: 'Đăng nhập thành công.' })
    @ApiResponse({
        status: 401,
        description:
            'Thông tin đăng nhập không hợp lệ hoặc tài khoản chưa thể đăng nhập.',
    })
    async login(
        @Body() dto: LoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const userAgent = req.get('user-agent') || '';
        const ipAddress = req.ip || '';

        const result = await this.authService.login(dto, userAgent, ipAddress);

        this.setAuthCookies(res, result.accessToken, result.refreshToken);

        return {
            user: result.user,
        };
    }

    @Post('refresh')
    @ApiOperation({
        summary: 'Làm mới phiên đăng nhập',
        description:
            'Dùng refresh token trong HttpOnly cookie để cấp lại access token và refresh token.',
    })
    @ApiResponse({ status: 200, description: 'Làm mới phiên thành công.' })
    @ApiResponse({
        status: 401,
        description: 'Refresh token không có, hết hạn hoặc không hợp lệ.',
    })
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.refresh_token;
        const isProduction =
            this.configService.get<string>('NODE_ENV') === 'production';

        if (!refreshToken) {
            clearAuthCookies(res, isProduction);
            throw new UnauthorizedException(
                'Phiên làm việc đã hết hạn hoặc không hợp lệ.',
            );
        }

        try {
            const tokens = await this.authService.refresh(refreshToken);

            this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

            return {
                message: 'Làm mới phiên đăng nhập thành công.',
            };
        } catch (error) {
            clearAuthCookies(res, isProduction);
            throw error;
        }
    }

    @Post('logout')
    @ApiOperation({
        summary: 'Đăng xuất',
        description:
            'Thu hồi phiên hiện tại và xóa access token, refresh token khỏi cookie.',
    })
    @ApiResponse({ status: 200, description: 'Đăng xuất thành công.' })
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.refresh_token;

        await this.authService.logout(refreshToken);

        clearAuthCookies(
            res,
            this.configService.get<string>('NODE_ENV') === 'production',
        );

        return {
            message: 'Đăng xuất thành công.',
        };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Lấy người dùng hiện tại',
        description:
            'Trả về thông tin tài khoản của người dùng từ access token trong HttpOnly cookie.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin người dùng thành công.',
    })
    @ApiResponse({
        status: 401,
        description: 'Chưa đăng nhập hoặc access token không hợp lệ.',
    })
    getMe(@CurrentUser() user: AuthUser) {
        return this.authService.getMe(user.id);
    }

    @Post('verify-email')
    @ApiOperation({
        summary: 'Xác minh email',
        description: 'Xác minh địa chỉ email bằng mã OTP đã được gửi.',
    })
    @ApiResponse({ status: 200, description: 'Xác minh email thành công.' })
    @ApiResponse({
        status: 400,
        description: 'Mã OTP không đúng, hết hạn hoặc không hợp lệ.',
    })
    verifyEmail(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto.email, dto.otp);
    }

    @Post('resend-verification')
    @ApiOperation({
        summary: 'Gửi lại mã xác minh email',
        description: 'Tạo và gửi lại mã OTP xác minh tới email người dùng.',
    })
    @ApiResponse({ status: 200, description: 'Đã gửi lại mã xác minh.' })
    @ApiResponse({
        status: 400,
        description: 'Email không hợp lệ hoặc đã được xác minh.',
    })
    resendVerification(@Body() dto: ResendVerificationDto) {
        return this.authService.resendVerification(dto.email);
    }

    @Post('forgot-password')
    @ApiOperation({
        summary: 'Yêu cầu đặt lại mật khẩu',
        description:
            'Gửi hướng dẫn đặt lại mật khẩu nếu email tồn tại mà không tiết lộ trạng thái tài khoản.',
    })
    @ApiResponse({
        status: 201,
        description: 'Yêu cầu đã được tiếp nhận.',
    })
    @ApiResponse({ status: 400, description: 'Email không hợp lệ.' })
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Get('reset-password/validate')
    @ApiOperation({
        summary: 'Kiểm tra liên kết đặt lại mật khẩu',
        description:
            'Kiểm tra reset token còn tồn tại, chưa sử dụng và chưa hết hạn.',
    })
    @ApiResponse({ status: 200, description: 'Reset token hợp lệ.' })
    @ApiResponse({
        status: 400,
        description: 'Reset token không hợp lệ, hết hạn hoặc đã sử dụng.',
    })
    validateResetToken(@Query() dto: ValidateResetTokenDto) {
        return this.authService.validateResetToken(dto.token);
    }

    @Post('reset-password')
    @ApiOperation({
        summary: 'Đặt lại mật khẩu',
        description:
            'Đổi mật khẩu bằng reset token, sử dụng token một lần và thu hồi tất cả phiên đăng nhập.',
    })
    @ApiResponse({
        status: 201,
        description: 'Đặt lại mật khẩu thành công.',
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu hoặc reset token không hợp lệ.',
    })
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.password);
    }

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Bắt đầu đăng nhập Google',
        description: 'Chuyển người dùng tới màn hình xác thực của Google.',
    })
    @ApiResponse({
        status: 302,
        description: 'Chuyển hướng tới Google OAuth.',
    })
    googleAuth() {}

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    @UseFilters(GoogleAuthExceptionFilter)
    @ApiOperation({
        summary: 'Xử lý callback Google OAuth',
        description:
            'Xử lý kết quả từ Google, tạo phiên đăng nhập bằng HttpOnly cookie và chuyển popup về frontend callback.',
    })
    @ApiResponse({
        status: 302,
        description: 'Chuyển popup về frontend callback với kết quả OAuth.',
    })
    async googleCallback(@Req() req: Request, @Res() res: Response) {
        const profile = req.user as GoogleProfile;

        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip;

        const result = await this.authService.googleLogin(
            profile,
            userAgent,
            ipAddress,
        );

        this.setAuthCookies(res, result.accessToken, result.refreshToken);

        const frontendUrl =
            this.configService.getOrThrow<string>('FRONTEND_URL');

        res.redirect(`${frontendUrl}/google/callback`);
    }
}
