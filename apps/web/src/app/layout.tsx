import type { Metadata } from 'next';
import { Nunito, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';

const fontSans = Nunito({
    subsets: ['vietnamese', 'latin'],
    variable: '--font-sans',
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
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
                    {children}
                    <Toaster position="top-right" />
                </QueryProvider>
            </body>
        </html>
    );
}
