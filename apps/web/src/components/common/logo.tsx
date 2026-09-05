import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type LogoVariant =
    | 'default'
    | 'v2'
    | 'v3'
    | 1
    | 2
    | 3
    | 'text'
    | 'text-color'
    | 'text-black'
    | 'text-dark'
    | 'only-text'
    | 'only-text-black';

interface LogoProps {
    variant?: LogoVariant;
    width?: number;
    height?: number;
    className?: string;
    href?: string;
    alt?: string;
}

const logoMap: Record<string | number, string> = {
    default: '/logos/logo.png',
    v1: '/logos/logo.png',
    1: '/logos/logo.png',
    v2: '/logos/logo-2.png',
    2: '/logos/logo-2.png',
    v3: '/logos/logo-3.png',
    3: '/logos/logo-3.png',
    text: '/logos/only-text.png',
    'text-color': '/logos/only-text.png',
    'only-text': '/logos/only-text.png',
    'text-black': '/logos/only-text-black.png',
    'text-dark': '/logos/only-text-black.png',
    'only-text-black': '/logos/only-text-black.png',
};

export function Logo({
    variant = 'default',
    width = 160,
    height = 40,
    className,
    href = '/',
    alt = 'Interviewly Logo',
}: LogoProps) {
    const src = logoMap[variant] ?? logoMap.default;

    const content = (
        <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority
            className={cn('h-auto object-contain', className)}
        />
    );

    if (href) {
        return (
            <Link href={href} className="inline-block">
                {content}
            </Link>
        );
    }

    return content;
}
