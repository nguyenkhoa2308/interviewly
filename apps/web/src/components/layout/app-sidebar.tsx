'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    ArrowRightLeft,
    Bookmark,
    BriefcaseBusiness,
    CalendarDays,
    ChartNoAxesColumn,
    CheckCircle,
    ChevronDown,
    FileText,
    House,
    List,
    Map,
    Settings,
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
                href: '/interviews/progress',
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
    const activeGroup =
        navigation.find(
            (group) =>
                group.label &&
                group.items.some(
                    (item) =>
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`),
                ),
        )?.label ?? null;
    const [expandedGroup, setExpandedGroup] = useState<string | null>(
        activeGroup,
    );

    return (
        <>
            <button
                type="button"
                aria-label="Đóng menu"
                className={cn(
                    'fixed inset-0 z-40 cursor-default bg-slate-950/35 backdrop-blur-[1px] transition-opacity 2xl:hidden',
                    open
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
            />

            <aside
                aria-label="Điều hướng chính"
                className={cn(
                    'fixed top-0 left-0 z-50 flex h-[100svh] w-64 touch-pan-y flex-col overflow-hidden border-r border-violet-100 bg-white transition-transform duration-200 ease-out 2xl:bottom-0 2xl:h-auto 2xl:translate-x-0',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-white px-5 2xl:h-16">
                    <Logo width={140} height={47} />
                    <button
                        type="button"
                        aria-label="Đóng thanh điều hướng"
                        className="focus-visible:ring-primary flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:outline-none 2xl:hidden"
                        onClick={onClose}
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pt-1 pb-[max(8rem,calc(env(safe-area-inset-bottom)+6rem))] [-webkit-overflow-scrolling:touch] 2xl:overflow-y-hidden 2xl:pt-3 2xl:pb-28">
                    {/* <p className="px-3 text-xs font-bold tracking-wide text-slate-400 uppercase">
                        Không gian làm việc
                    </p> */}
                    <nav className="mt-1 space-y-1.5 2xl:mt-2 2xl:space-y-[18px]">
                        {navigation.map((group, index) => {
                            const groupId = group.label
                                ? `app-sidebar-${group.label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
                                : undefined;
                            const expanded = group.label
                                ? expandedGroup === group.label
                                : true;

                            return (
                                <div key={group.label ?? index}>
                                    {index === navigation.length - 1 && (
                                        <div
                                            aria-hidden="true"
                                            className="mx-3 mb-3 h-px bg-slate-200 2xl:mb-4"
                                        />
                                    )}

                                    {group.label && (
                                        <>
                                            <button
                                                type="button"
                                                aria-expanded={expanded}
                                                aria-controls={groupId}
                                                className="focus-visible:ring-primary flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-[7px] text-left text-xs font-bold tracking-[0.04em] text-slate-400 uppercase hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:outline-none 2xl:hidden"
                                                onClick={() =>
                                                    setExpandedGroup(
                                                        expanded
                                                            ? null
                                                            : group.label!,
                                                    )
                                                }
                                            >
                                                {group.label}
                                                <ChevronDown
                                                    className={cn(
                                                        'size-4 transition-transform duration-200',
                                                        expanded &&
                                                            'rotate-180',
                                                    )}
                                                />
                                            </button>
                                            <p className="mb-2.5 hidden px-3 text-xs font-bold tracking-[0.04em] text-slate-400 uppercase 2xl:block">
                                                {group.label}
                                            </p>
                                        </>
                                    )}

                                    <div
                                        id={groupId}
                                        className={cn(
                                            'space-y-1',
                                            group.label &&
                                                !expanded &&
                                                'hidden 2xl:block',
                                            group.label &&
                                                expanded &&
                                                'mt-1 2xl:mt-0',
                                        )}
                                    >
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
                                                    onClick={() => {
                                                        setExpandedGroup(
                                                            group.label ?? null,
                                                        );
                                                        onClose();
                                                    }}
                                                    className={cn(
                                                        'flex min-h-10 items-center gap-3 rounded-xl px-3 py-[7px] transition-colors duration-150 2xl:py-2',
                                                        isActive
                                                            ? 'text-primary bg-[#ece3ff]'
                                                            : 'text-slate-800 hover:bg-violet-50/80',
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            'size-5 shrink-0',
                                                            isActive
                                                                ? 'text-primary'
                                                                : 'text-slate-500',
                                                        )}
                                                        strokeWidth={2}
                                                    />

                                                    <span
                                                        className={cn(
                                                            'text-[15px] leading-5 font-extrabold tracking-[-0.01em]',
                                                            isActive
                                                                ? 'text-primary'
                                                                : 'text-slate-900',
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
                <svg
                    aria-hidden="true"
                    viewBox="0 0 256 120"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full"
                >
                    <path
                        d="M0 47C42 31 72 33 108 48C149 66 185 60 256 23V120H0Z"
                        fill="#7045FF"
                        fillOpacity="0.035"
                    />
                    <path
                        d="M0 78C44 44 83 49 131 82C175 112 213 78 256 53V120H0Z"
                        fill="#7045FF"
                        fillOpacity="0.075"
                    />
                </svg>
            </aside>
        </>
    );
}
