import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
    @ApiProperty({
        description: 'Email đang chờ xác minh.',
        example: 'nguyenkhoa@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Mã OTP gồm 6 chữ số được gửi qua email.',
        example: '123456',
        pattern: '^\\d{6}$',
    })
    @Matches(/^\d{6}$/, {
        message: 'Mã xác minh phải gồm 6 chữ số.',
    })
    otp: string;
}
