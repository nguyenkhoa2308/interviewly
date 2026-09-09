'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ArrowRightLeft,
    BarChart,
    Bookmark,
    BriefcaseBusiness,
    CalendarDays,
    ChartNoAxesColumn,
    CheckCircle,
    Clock,
    FileText,
    House,
    List,
    Map,
    Settings,
    TrendingUp,
    X,
    Zap,
} from 'lucide-react';

import { Logo } from '@/components/common/logo';
import { cn } from '@/lib/utils';

const navigation = [
    {
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: House,
            },
        ],
    },
    {
        label: 'PREPARE',
        items: [
            {
                title: 'Interviews',
                href: '/interviews',
                icon: CalendarDays,
            },
            {
                title: 'Practice',
                href: '/practice',
                icon: Zap,
            },
            {
                title: 'Question Bank',
                href: '/questions',
                icon: List,
            },
        ],
    },
    {
        label: 'CAREER',
        items: [
            {
                title: 'CV',
                href: '/cv',
                icon: FileText,
            },
            {
                title: 'Job Descriptions',
                href: '/job-descriptions',
                icon: BriefcaseBusiness,
            },
            {
                title: 'CV–JD Matching',
                href: '/matching',
                icon: ArrowRightLeft,
            },
        ],
    },
    {
        label: 'GROWTH',
        items: [
            {
                title: 'Reports',
                href: '/reports',
                icon: ChartNoAxesColumn,
            },
            {
                title: 'Skill & Progress',
                href: '/skill-progress',
                icon: CheckCircle,
            },
            {
                title: 'Learning Plan',
                href: '/learning-plan',
                icon: Map,
            },
        ],
    },
    {
        label: 'LIBRARY',
        items: [
            {
                title: 'History',
                href: '/history',
                icon: Clock,
            },
            {
                title: 'Saved',
                href: '/saved',
                icon: Bookmark,
            },
        ],
    },
    {
        items: [
            {
                title: 'Settings',
                href: '/settings',
                icon: Settings,
            },
        ],
    },
];

interface AppSidebarProps {
    open: boolean;
    onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
    const pathname = usePathname();

    return (
        <>
            <button
                type="button"
                aria-label="Đóng menu"
                className={cn(
                    'fixed inset-0 z-40 cursor-default bg-slate-950/35 backdrop-blur-[1px] transition-opacity lg:hidden',
                    open
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
            />

            <aside
                aria-label="Điều hướng chính"
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-violet-100 bg-white transition-transform duration-200 ease-out lg:translate-x-0',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-violet-100 px-5">
                    <Logo width={151} height={38} />
                    <button
                        type="button"
                        aria-label="Đóng thanh điều hướng"
                        className="focus-visible:ring-primary flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
                        onClick={onClose}
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-5">
                    {/* <p className="px-3 text-xs font-bold tracking-wide text-slate-400 uppercase">
                        Không gian làm việc
                    </p> */}
                    <nav className="mt-3 space-y-4">
                        {navigation.map((group, index) => {
                            return (
                                <div key={group.label ?? index}>
                                    {group.label && (
                                        <p className="mb-3 px-3 text-[13px] font-bold tracking-wide text-slate-400 uppercase">
                                            {group.label}
                                        </p>
                                    )}

                                    <div className={cn('space-y-1')}>
                                        {group.items.map((item) => {
                                            const Icon = item.icon;

                                            const isActive =
                                                pathname === item.href ||
                                                pathname.startsWith(
                                                    `${item.href}/`,
                                                );

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={cn(
                                                        'flex items-center gap-3 rounded-lg px-3 py-2',
                                                        isActive
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'text-slate-700 hover:bg-slate-50',
                                                        index ===
                                                            navigation.length -
                                                                1 &&
                                                            'border-t border-slate-100 pt-5',
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            'size-5',
                                                            isActive
                                                                ? 'text-primary'
                                                                : 'text-slate-400',
                                                        )}
                                                        strokeWidth={2}
                                                    />

                                                    <span
                                                        className={cn(
                                                            'text-[15px] font-bold',
                                                            isActive
                                                                ? 'text-primary'
                                                                : 'text-slate-800',
                                                        )}
                                                    >
                                                        {item.title}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>
                </div>
            </aside>
        </>
    );
}
