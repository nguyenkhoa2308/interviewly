import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    handleRequest<TUser = any>(
        err: any,
        user: TUser,
        info: any,
        context: ExecutionContext,
    ): TUser {
        const request = context.switchToHttp().getRequest();

        if (request.query?.error === 'access_denied') {
            throw new UnauthorizedException({
                code: 'GOOGLE_AUTH_CANCELLED',
                message: 'Đăng nhập Google đã bị hủy.',
            });
        }

        if (err || !user) {
            throw (
                err ||
                new UnauthorizedException({
                    code: 'GOOGLE_AUTH_FAILED',
                    message: 'Không thể xác thực tài khoản Google.',
                })
            );
        }

        return user;
    }
}
