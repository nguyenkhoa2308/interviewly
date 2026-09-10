import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
    @ApiProperty({ example: 'DELETE' })
    @IsString({ message: 'Xác nhận xóa tài khoản phải là chuỗi ký tự.' })
    @IsIn(['DELETE'], {
        message: 'Vui lòng nhập chính xác DELETE để xác nhận.',
    })
    confirmation: 'DELETE';

    @ApiProperty({ description: 'Mật khẩu hiện tại.', example: 'Password@123' })
    @IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại.' })
    currentPassword: string;
}
