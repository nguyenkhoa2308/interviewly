import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const PURPLE = '#6938ef';

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
        text?: string;
    }): Promise<void> {
        await this.transporter.sendMail({ from: this.from, ...options });
    }

    async sendVerificationOtp(to: string, otp: string): Promise<void> {
        await this.send({
            to,
            subject: `${otp} là mã xác minh Interviewly của bạn`,
            html: emailLayout({
                eyebrow: 'Xác minh tài khoản',
                title: 'Xác minh email của bạn',
                content: `<p style="margin:0;color:#667085;font-size:16px;line-height:26px">Chào mừng bạn đến với Interviewly. Hãy dùng mã bên dưới để xác minh địa chỉ email và hoàn tất đăng ký.</p>
                <div style="margin:28px 0;padding:22px 16px;border:1px solid #e9e2ff;border-radius:14px;background:#f7f5ff;text-align:center">
                  <div style="margin-bottom:8px;color:#667085;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Mã xác minh của bạn</div>
                  <div style="color:${PURPLE};font-size:34px;font-weight:800;letter-spacing:10px;line-height:42px">${escapeHtml(otp)}</div>
                </div>
                ${securityNotice('Mã này có hiệu lực trong 10 phút và chỉ dùng được một lần.')}`,
                footer: 'Nếu bạn không đăng ký tài khoản Interviewly, bạn có thể bỏ qua email này một cách an toàn.',
            }),
            text: `Xác minh email Interviewly\n\nMã xác minh của bạn: ${otp}\nMã có hiệu lực trong 10 phút và chỉ dùng được một lần.`,
        });
    }

    async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
        const safeUrl = escapeHtml(resetUrl);
        await this.send({
            to,
            subject: 'Đặt lại mật khẩu Interviewly',
            html: emailLayout({
                eyebrow: 'Bảo mật tài khoản',
                title: 'Đặt lại mật khẩu',
                content: `<p style="margin:0;color:#667085;font-size:16px;line-height:26px">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Interviewly của bạn.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0"><tr><td align="center">
                  <a href="${safeUrl}" style="display:inline-block;padding:15px 30px;border-radius:10px;background:${PURPLE};color:#fff;font-size:16px;font-weight:700;text-decoration:none">Đặt lại mật khẩu</a>
                </td></tr></table>
                ${securityNotice('Liên kết này có hiệu lực trong 30 phút và chỉ dùng được một lần.')}
                <p style="margin:24px 0 8px;color:#667085;font-size:13px;line-height:21px">Nếu nút không hoạt động, hãy sao chép liên kết này vào trình duyệt:</p>
                <p style="margin:0;padding:12px;border-radius:8px;background:#f8fafc;color:#475467;font-size:12px;line-height:18px;word-break:break-all">${safeUrl}</p>`,
                footer: 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại của bạn vẫn an toàn.',
            }),
            text: `Đặt lại mật khẩu Interviewly\n\nMở liên kết sau để đặt lại mật khẩu:\n${resetUrl}\n\nLiên kết có hiệu lực trong 30 phút và chỉ dùng được một lần.`,
        });
    }
}

function emailLayout(options: {
    eyebrow: string;
    title: string;
    content: string;
    footer: string;
}): string {
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light only"><title>${escapeHtml(options.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f2fb;font-family:Arial,'Helvetica Neue',sans-serif;color:#111827">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(options.title)} trên Interviewly</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f2fb"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px">
<tr><td style="padding:0 4px 22px"><span style="display:inline-block;vertical-align:middle;width:32px;height:32px;border-radius:9px;background:${PURPLE};color:#fff;font-size:22px;font-weight:800;line-height:32px;text-align:center">I</span><span style="margin-left:9px;vertical-align:middle;font-size:22px;font-weight:800">Interviewly</span></td></tr>
<tr><td style="border:1px solid #e6e1f2;border-radius:18px;background:#fff;padding:42px 44px">
<div style="margin-bottom:12px;color:${PURPLE};font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase">${escapeHtml(options.eyebrow)}</div>
<h1 style="margin:0 0 20px;font-size:28px;line-height:36px">${escapeHtml(options.title)}</h1>
${options.content}
<div style="margin-top:30px;padding-top:24px;border-top:1px solid #eaecf0;color:#98a2b3;font-size:12px;line-height:19px">${escapeHtml(options.footer)}</div>
</td></tr><tr><td align="center" style="padding:22px 12px;color:#98a2b3;font-size:12px">© ${new Date().getFullYear()} Interviewly · Luyện tập thông minh, phỏng vấn tự tin hơn</td></tr>
</table></td></tr></table></body></html>`;
}

function securityNotice(message: string): string {
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:10px;background:#f7f5ff"><tr>
      <td width="44" valign="top" style="padding:15px 0 15px 16px;color:${PURPLE};font-size:20px">&#128274;</td>
      <td style="padding:15px 16px 15px 4px;color:#475467;font-size:13px;line-height:20px">${escapeHtml(message)}</td>
    </tr></table>`;
}

function escapeHtml(value: string): string {
    const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#039;',
        '"': '&quot;',
    };
    return value.replace(/[&<>'"]/g, (character) => entities[character]);
}
