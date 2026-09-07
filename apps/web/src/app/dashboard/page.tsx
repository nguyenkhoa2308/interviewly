'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/auth/use-logout';

export default function DashboardPage() {
    const logout = useLogout();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">
                Chào mừng bạn đến với Interviewly!
            </h1>
            <p className="text-muted-foreground mt-3 max-w-md text-sm font-semibold">
                Tài khoản của bạn đã được xác thực và đăng nhập thành công.
                Trang Dashboard đang được hoàn thiện.
            </p>
            <div className="mt-6 flex gap-4">
                <Link
                    href="/"
                    className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-bold shadow transition-opacity hover:opacity-90"
                >
                    Về trang chủ
                </Link>
                <Button
                    type="button"
                    variant="outline"
                    disabled={logout.isPending}
                    onClick={() => logout.mutate()}
                >
                    {logout.isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
                </Button>
            </div>
        </div>
    );
}
