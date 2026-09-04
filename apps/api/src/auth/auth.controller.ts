import type { Response, Request } from 'express';
import {
    Body,
    Controller,
    Req,
    Post,
    Res,
    UnauthorizedException,
    Get,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { clearAuthCookies, setAuthCookies } from './utils/cookie.util';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './types/auth-user.type';

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
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
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
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException(
                'Phiên làm việc đã hết hạn hoặc không hợp lệ.',
            );
        }

        const tokens = await this.authService.refresh(refreshToken);

        this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

        return {
            message: 'Làm mới phiên đăng nhập thành công.',
        };
    }

    @Post('logout')
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
    getMe(@CurrentUser() user: AuthUser) {
        return this.authService.getMe(user.id);
    }
}
