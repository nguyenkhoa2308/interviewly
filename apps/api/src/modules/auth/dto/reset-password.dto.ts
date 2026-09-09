import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({
        description: 'Mã đặt lại mật khẩu nhận được trong liên kết email.',
        example: '7a88c144f86e4adca1f8b97c8cb120e4',
    })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Mã đặt lại mật khẩu phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Liên kết đặt lại mật khẩu không hợp lệ.' })
    token: string;

    @ApiProperty({
        description: 'Mật khẩu mới, tối thiểu 8 ký tự và có ký tự đặc biệt.',
        minLength: 8,
        example: 'MatKhauMoi@123',
    })
    @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới.' })
    @MinLength(8, { message: 'Mật khẩu cần có ít nhất 8 ký tự.' })
    @Matches(/[^A-Za-z0-9]/, {
        message: 'Mật khẩu cần có ít nhất một ký tự đặc biệt.',
    })
    password: string;
}
