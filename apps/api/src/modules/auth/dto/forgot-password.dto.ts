import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
    @ApiProperty({
        description: 'Email của tài khoản cần đặt lại mật khẩu.',
        example: 'nguyenkhoa@example.com',
    })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    @IsString({ message: 'Email phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Vui lòng nhập email.' })
    @IsEmail({}, { message: 'Email không đúng định dạng.' })
    email: string;
}
