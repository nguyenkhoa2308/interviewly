import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface PageBreadcrumbItem {
    label: string;
    href?: string;
}

export function PageBreadcrumb({
    items,
    className = '',
}: {
    items: PageBreadcrumbItem[];
    className?: string;
}) {
    return (
        <nav
            aria-label="Breadcrumb"
            className={`min-w-0 ${className}`}
        >
            <ol className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-500">
                <li className="shrink-0">
                    <Link
                        href="/dashboard"
                        aria-label="Trang tổng quan"
                        className="hover:text-primary inline-flex size-7 items-center justify-center rounded-md transition-colors"
                    >
                        <Home className="size-4" aria-hidden="true" />
                    </Link>
                </li>
                {items.map((item, index) => {
                    const current = index === items.length - 1;
                    return (
                        <li
                            key={item.href ?? item.label}
                            className="flex min-w-0 items-center gap-1.5"
                        >
                            <ChevronRight
                                className="size-4 shrink-0 text-slate-300"
                                aria-hidden="true"
                            />
                            {item.href && !current ? (
                                <Link
                                    href={item.href}
                                    className="hover:text-primary truncate transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    className="truncate font-bold text-slate-800"
                                    aria-current={current ? 'page' : undefined}
                                >
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
