'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ShieldCheck, Send, Sparkles } from 'lucide-react';

import { Logo } from '@/components/common/logo';
import { useEffect } from 'react';

const verifyBenefits = [
    {
        icon: ShieldCheck,
        title: 'Bảo mật tài khoản',
        description: 'Đảm bảo chính bạn là người sở hữu và quản lý tài khoản.',
    },
    {
        icon: Send,
        title: 'Bảo vệ tiến trình học tập',
        description:
            'Lưu trữ an toàn các bài tập phỏng vấn và dữ liệu của bạn.',
    },
    {
        icon: Sparkles,
        title: 'Không bao giờ có thư rác',
        description: 'Chúng tôi chỉ gửi các thông báo quan trọng về tài khoản.',
    },
];

export function VerifyEmailSidebar() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get('email');

    useEffect(() => {
        if (!email) {
            router.replace('/sign-up');
        }
    }, [email, router]);

    return (
        <div className="bg-primary/5 relative flex h-full flex-col justify-between p-10 pb-8 sm:pl-10 xl:pl-20">
            <div>
                <Logo variant="default" className="w-50" />

                <div className="mt-10 space-y-3">
                    <p className="text-muted-foreground text-2xl font-bold">
                        Chỉ còn một bước nữa!
                    </p>
                    <h1 className="text-primary text-4xl font-black tracking-tight">
                        Xác thực email của bạn
                    </h1>
                    <p className="text-muted-foreground text-base font-semibold">
                        Chúng tôi đã gửi mã xác minh 6 chữ số tới:
                    </p>

                    {/* Email badge with Change link */}
                    <div className="border-border/80 bg-primary/5 mt-3 flex w-fit max-w-full items-center gap-2 rounded-md border px-3.5 py-4">
                        <Mail className="text-primary h-5 w-5 shrink-0 stroke-[2.5]" />
                        <span className="text-foreground truncate text-sm font-bold">
                            {email}
                        </span>
                        <Link
                            href="/sign-up"
                            className="text-primary hover:text-secondary-foreground ml-2 shrink-0 text-sm font-bold transition-colors"
                        >
                            Thay đổi
                        </Link>
                    </div>
                </div>

                {/* Benefits list */}
                <div className="mt-8 space-y-10">
                    {verifyBenefits.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <div key={index} className="flex items-start gap-4">
                                <div className="bg-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-foreground font-bold">
                                        {item.title}
                                    </h3>
                                    <p className="text-muted-foreground mt-0.5 text-sm font-semibold">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Illustration from public/images */}
            <div className="relative flex w-full justify-center">
                <Image
                    src="/images/verify-email-illustration.png"
                    alt="Xác thực email"
                    width={1000}
                    height={1000}
                    priority
                    className="pointer-events-none h-auto w-full max-w-full drop-shadow-xl select-none"
                />
            </div>
        </div>
    );
}
