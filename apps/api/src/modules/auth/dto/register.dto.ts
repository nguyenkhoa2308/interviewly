import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MinLength,
} from 'class-validator';

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    @Matches(/[^A-Za-z0-9]/, {
        message: 'Mật khẩu cần có ít nhất một ký tự đặc biệt.',
    })
    password: string;
}
