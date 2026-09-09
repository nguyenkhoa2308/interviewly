import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenDto {
    @ApiProperty({
        description:
            'Mã đặt lại mật khẩu lấy từ tham số token trong liên kết email.',
        example: '7a88c144f86e4adca1f8b97c8cb120e4',
    })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Mã đặt lại mật khẩu phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Liên kết đặt lại mật khẩu không hợp lệ.' })
    token: string;
}
