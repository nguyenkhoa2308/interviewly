import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PasswordRecoveryShell } from '@/components/auth/password-recovery-shell';

export default function ResetPasswordSuccessPage() {
    return (
        <PasswordRecoveryShell stage="done">
            <div className="w-full max-w-2xl text-center">
                <div className="relative mx-auto mb-4 h-64 w-full max-w-md">
                    <Image
                        src="/images/auth/password-reset-success.png"
                        alt="Đặt lại mật khẩu thành công"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Đặt lại mật khẩu thành công!
                </h2>
                <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-base leading-7 font-semibold">
                    Mật khẩu của bạn đã được cập nhật. Giờ đây, bạn có thể đăng
                    nhập bằng mật khẩu mới.
                </p>
                <div className="mx-auto mt-9 max-w-lg space-y-3">
                    <Button
                        asChild
                        size="lg"
                        className="h-14 w-full rounded-sm text-base font-bold shadow-[0_12px_28px_rgba(109,40,217,0.22)]"
                    >
                        <Link href="/sign-in">
                            Đăng nhập ngay
                            <ArrowRight className="size-5" />
                        </Link>
                    </Button>
                    <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="!border-primary text-primary hover:text-secondary-foreground hover:bg-primary/5 h-14 w-full rounded-sm text-base font-bold"
                    >
                        <Link href="/">Về trang chủ</Link>
                    </Button>
                </div>
            </div>
        </PasswordRecoveryShell>
    );
}
