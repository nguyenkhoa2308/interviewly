import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MinLength,
} from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        description: 'Tên hiển thị của người dùng.',
        example: 'Nguyễn Đức Khoa',
    })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({
        description: 'Email dùng để đăng nhập và xác minh tài khoản.',
        example: 'nguyenkhoa@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Mật khẩu tối thiểu 8 ký tự và có ký tự đặc biệt.',
        example: 'Interviewly@123',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    @Matches(/[^A-Za-z0-9]/, {
        message: 'Mật khẩu cần có ít nhất một ký tự đặc biệt.',
    })
    password: string;
}
