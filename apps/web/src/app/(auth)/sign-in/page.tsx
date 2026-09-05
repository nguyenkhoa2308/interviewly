import Link from 'next/link';
import { ChartNoAxesColumn, Sparkles, Target } from 'lucide-react';

import { Logo } from '@/components/common/logo';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/sign-in-form';

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
    },
    {
        icon: Target,
        title: 'Theo dõi tiến trình',
        description:
            'Đánh giá sự tự tin và đo lường sự tăng trưởng qua từng buổi luyện.',
    },
];

export default function SignInPage() {
    return (
        <AuthShell
            sidebar={
                <div className="flex h-full flex-col p-10 sm:pl-10 xl:pb-20 xl:pl-20">
                    <Logo variant="default" className="w-50" />

                    <div className="my-auto">
                        <div className="bg-primary/10 text-primary mb-6 inline-block rounded-full p-2 px-3 text-sm font-bold">
                            Nền tảng chuẩn bị phỏng vấn với AI
                        </div>

                        <h1 className="text-4xl font-extrabold tracking-tight">
                            Chào mừng bạn trở lại
                        </h1>

                        <p className="text-muted-foreground mt-4 font-semibold">
                            Đăng nhập vào Interviewly để tiếp tục các buổi luyện
                            tập phỏng vấn và theo dõi sự tiến bộ của bạn.
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
                        Chưa có tài khoản?{' '}
                        <Link
                            href="/sign-up"
                            className="text-primary hover:text-secondary-foreground ml-1 transition-colors duration-300"
                        >
                            Đăng ký ngay
                        </Link>
                    </span>
                </div>
            }
        >
            <div className="bg-card flex h-full w-full flex-col items-start justify-center rounded-xl p-8 shadow-2xl sm:p-12 lg:block lg:h-auto lg:max-w-2xl lg:px-16 lg:py-20">
                {/* Heading khu vực form */}
                <div className="mb-8">
                    <h2 className="text-2xl font-extrabold tracking-tight">
                        Đăng nhập
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm font-semibold">
                        Nhập thông tin xác thực để truy cập vào tài khoản của
                        bạn.
                    </p>
                </div>

                <SignInForm />
            </div>
        </AuthShell>
    );
}
