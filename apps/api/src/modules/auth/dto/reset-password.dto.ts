import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ description: 'Raw password reset token received by email' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Mã đặt lại mật khẩu phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Liên kết đặt lại mật khẩu không hợp lệ.' })
    token: string;

    @ApiProperty({ minLength: 8, example: 'New-password@123' })
    @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới.' })
    @MinLength(8, { message: 'Mật khẩu cần có ít nhất 8 ký tự.' })
    @Matches(/[^A-Za-z0-9]/, {
        message: 'Mật khẩu cần có ít nhất một ký tự đặc biệt.',
    })
    password: string;
}
