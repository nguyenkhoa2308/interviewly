import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly transporter: Transporter;
    private readonly from: string;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.getOrThrow<string>('MAIL_HOST'),
            port: this.configService.getOrThrow<number>('MAIL_PORT'),
            secure: this.configService.getOrThrow<boolean>('MAIL_SECURE'),
            auth: {
                user: this.configService.getOrThrow<string>('MAIL_USER'),
                pass: this.configService.getOrThrow<string>('MAIL_PASSWORD'),
            },
        });

        this.from = this.configService.getOrThrow<string>('MAIL_FROM');
    }

    async send(options: {
        to: string;
        subject: string;
        html: string;
    }): Promise<void> {
        await this.transporter.sendMail({
            from: this.from,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
    }

    async sendVerificationOtp(to: string, otp: string): Promise<void> {
        await this.send({
            to,
            subject: 'Xác minh địa chỉ email của bạn',
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Xác minh email</h2>

          <p>Cảm ơn bạn đã đăng ký Interviewly.</p>
          <p>Mã xác minh của bạn là:</p>

          <div style="
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 8px;
            margin: 24px 0;
          ">
            ${otp}
          </div>

          <p>Mã này có hiệu lực trong 10 phút.</p>
          <p>Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email.</p>
        </div>
      `,
        });
    }
}
