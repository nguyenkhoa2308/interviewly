import Link from 'next/link';
import { ChartNoAxesColumn, Sparkles, Target, Zap } from 'lucide-react';

import { Logo } from '@/components/common/logo';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from '@/components/auth/sign-up-form';

const benefits = [
    {
        icon: Sparkles,
        title: 'Phỏng vấn thử cùng AI',
        description:
            'Trải nghiệm phỏng vấn thực tế được thiết kế riêng cho vị trí của bạn.',
    },
    {
        icon: ChartNoAxesColumn,
        title: 'Phản hồi cá nhân hóa',
        description:
            'Nhận đánh giá chi tiết về câu trả lời và gợi ý cải thiện tức thì.',
        fill: true,
    },
    {
        icon: Target,
        title: 'Theo dõi tiến trình',
        description:
            'Đánh giá sự tự tin và đo lường sự tăng trưởng qua từng buổi luyện.',
        fill: false,
    },
];

export default function SignUpPage() {
    return (
        <AuthShell
            sidebar={
                <div className="flex h-full flex-col p-10 pb-20">
                    <Logo variant="default" className="w-50" />

                    <div className="my-auto">
                        <div className="bg-primary/10 text-primary mb-6 inline-block rounded-full p-2 px-3 text-sm font-bold">
                            Nền tảng chuẩn bị phỏng vấn với AI
                        </div>

                        <h1 className="text-4xl font-extrabold tracking-tight">
                            Tạo tài khoản của bạn
                        </h1>

                        <p className="text-muted-foreground mt-4 font-semibold">
                            Tham gia Interviewly để phỏng vấn thử cùng AI, nhận
                            phản hồi cá nhân hóa và theo dõi tiến trình của bạn.
                        </p>

                        <div className="mt-8 mt-15 w-2/3 space-y-10">
                            {benefits.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-start gap-4"
                                    >
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

                    <span className="text-muted-foreground text-sm font-semibold">
                        Đã có tài khoản?{' '}
                        <Link
                            href="/sign-in"
                            className="text-primary hover:text-secondary-foreground ml-1 transition-colors duration-300"
                        >
                            Đăng nhập
                        </Link>
                    </span>
                </div>
            }
        >
            <div className="bg-card h-full w-full max-w-4xl rounded-xl px-16 py-20 shadow-2xl lg:h-auto">
                {/* Heading khu vực form */}
                <div className="mb-8">
                    <h2 className="text-2xl font-extrabold tracking-tight">
                        Đăng ký
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm font-semibold">
                        Điền thông tin bên dưới để bắt đầu hành trình của bạn.
                    </p>
                </div>

                <SignUpForm />
            </div>
        </AuthShell>
    );
}
