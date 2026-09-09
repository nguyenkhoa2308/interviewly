import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'Email đã đăng ký.',
        example: 'nguyenkhoa@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Mật khẩu tài khoản, tối thiểu 8 ký tự.',
        example: 'Interviewly@123',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    password: string;
}
