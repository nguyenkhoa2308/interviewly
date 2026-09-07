import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenDto {
    @ApiProperty({ description: 'Raw password reset token received by email' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Mã đặt lại mật khẩu phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Liên kết đặt lại mật khẩu không hợp lệ.' })
    token: string;
}
