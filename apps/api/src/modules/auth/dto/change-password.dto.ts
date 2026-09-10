import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({ example: 'MatKhauCu@123' })
    @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại.' })
    currentPassword: string;

    @ApiProperty({ example: 'MatKhauMoi@123', minLength: 8 })
    @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới.' })
    @MinLength(8, { message: 'Mật khẩu cần có ít nhất 8 ký tự.' })
    @Matches(/[^A-Za-z0-9]/, {
        message: 'Mật khẩu cần có ít nhất một ký tự đặc biệt.',
    })
    newPassword: string;
}
