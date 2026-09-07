import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function ResetLinkStatus({
    variant,
}: {
    variant: 'expired' | 'unavailable';
}) {
    const isExpired = variant === 'expired';

    return (
        <div className="w-full max-w-2xl text-center">
            <div className="relative mx-auto mb-4 h-64 w-full max-w-md">
                <Image
                    src="/images/auth/reset-link-expired.png"
                    alt={
                        isExpired
                            ? 'Liên kết đặt lại mật khẩu đã hết hạn'
                            : 'Liên kết đặt lại mật khẩu không khả dụng'
                    }
                    fill
                    className="object-contain"
                    priority
                />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {isExpired
                    ? 'Liên kết đặt lại mật khẩu đã hết hạn'
                    : 'Liên kết không khả dụng'}
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base leading-7 font-semibold">
                {isExpired
                    ? 'Vì lý do bảo mật, liên kết đặt lại mật khẩu chỉ có hiệu lực trong thời gian giới hạn. Hãy yêu cầu một liên kết mới để tiếp tục.'
                    : 'Liên kết này không hợp lệ, đã được sử dụng hoặc không còn khả dụng. Hãy yêu cầu một liên kết mới để tiếp tục đặt lại mật khẩu.'}
            </p>
            <div className="mx-auto mt-9 max-w-lg space-y-3">
                <Button
                    asChild
                    size="lg"
                    className="h-14 w-full rounded-xl text-base font-bold shadow-[0_12px_28px_rgba(109,40,217,0.22)]"
                >
                    <Link href="/forgot-password">
                        Yêu cầu liên kết mới
                        <ArrowRight className="size-5" />
                    </Link>
                </Button>
                <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5 h-14 w-full rounded-xl text-base font-bold"
                >
                    <Link href="/sign-in">Quay lại đăng nhập</Link>
                </Button>
            </div>
        </div>
    );
}
