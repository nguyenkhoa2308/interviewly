import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthRouteGuard } from '@/components/auth/auth-route-guard';

const fontSans = localFont({
    src: '../assets/fonts/Nunito-Variable.ttf',
    variable: '--font-nunito',
    weight: '200 1000',
    display: 'swap',
});

const geistMono = localFont({
    src: '../assets/fonts/GeistMono-Variable.woff2',
    variable: '--font-geist-mono',
    weight: '100 900',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Interviewly - Luyện phỏng vấn thông minh cùng AI',
    description:
        'Luyện tập thông minh hơn, xây dựng sự tự tin và sẵn sàng cho cơ hội nghề nghiệp tiếp theo của bạn.',
    icons: {
        icon: '/logos/logo-3.png',
        apple: '/logos/logo-3.png',
    },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html
            lang="vi"
            className={cn(
                'h-full',
                'antialiased',
                fontSans.variable,
                geistMono.variable,
                'font-sans',
            )}
        >
            <body className="flex min-h-full flex-col font-sans">
                <QueryProvider>
                    <AuthRouteGuard>{children}</AuthRouteGuard>
                    <Toaster position="top-right" />
                </QueryProvider>
            </body>
        </html>
    );
}
