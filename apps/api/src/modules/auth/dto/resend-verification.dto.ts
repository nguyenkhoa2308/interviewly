import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
    @ApiProperty({
        description: 'Email cần nhận lại mã xác minh.',
        example: 'nguyenkhoa@example.com',
    })
    @IsEmail()
    email: string;
}
