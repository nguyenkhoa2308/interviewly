'use client';

import Link from 'next/link';
import { Bell, ChevronDown, LogOut, Menu, UserRound } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLogout } from '@/hooks/auth/use-logout';
import { useMe } from '@/hooks/auth/use-me';

export function AppHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
    const meQuery = useMe();
    const logout = useLogout();
    const user = meQuery.data;
    const initials = user ? getInitials(user.fullName) : '';

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-violet-100 bg-white px-4 backdrop-blur-md sm:px-6 lg:px-8">
            <button
                type="button"
                aria-label="Mở thanh điều hướng"
                className="focus-visible:ring-primary flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
                onClick={onOpenSidebar}
            >
                <Menu className="size-5" />
            </button>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <button
                    type="button"
                    aria-label="Thông báo"
                    className="focus-visible:ring-primary hover:text-primary relative flex size-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 focus-visible:ring-2 focus-visible:outline-none"
                >
                    <Bell className="size-5" />
                    <span className="bg-primary absolute top-2.5 right-2.5 size-2 rounded-full ring-2 ring-white" />
                </button>

                <span aria-hidden="true" className="h-7 w-px bg-slate-200" />

                <DropdownMenuPrimitive.Root>
                    <DropdownMenuPrimitive.Trigger asChild>
                        <button
                            type="button"
                            className="focus-visible:ring-primary flex min-w-0 cursor-pointer items-center gap-2 rounded-xl p-1.5 pr-2 text-left transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:outline-none"
                        >
                            <Avatar className="size-9 ring-2 ring-violet-100">
                                {user?.avatarUrl && (
                                    <AvatarImage
                                        src={user.avatarUrl}
                                        alt={`Ảnh đại diện của ${user.fullName}`}
                                    />
                                )}
                                <AvatarFallback
                                    delayMs={300}
                                    className="text-xs"
                                >
                                    {initials || (
                                        <UserRound className="size-4" />
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <span className="hidden min-w-0 sm:block">
                                <span className="block max-w-36 truncate text-sm font-bold text-slate-900">
                                    {user?.fullName ?? 'Người dùng'}
                                </span>
                                <span className="block max-w-36 truncate text-xs text-slate-500">
                                    {user?.email ?? 'Đang tải...'}
                                </span>
                            </span>
                            <ChevronDown className="hidden size-4 shrink-0 text-slate-400 sm:block" />
                        </button>
                    </DropdownMenuPrimitive.Trigger>

                    <DropdownMenuPrimitive.Portal>
                        <DropdownMenuPrimitive.Content
                            align="end"
                            sideOffset={8}
                            className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 min-w-52 rounded-xl border border-violet-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(45,31,89,0.16)] outline-none"
                        >
                            <DropdownMenuPrimitive.Item asChild>
                                <Link
                                    href="/profile"
                                    className="focus:text-primary flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:bg-violet-50"
                                >
                                    <UserRound className="size-4" />
                                    Hồ sơ cá nhân
                                </Link>
                            </DropdownMenuPrimitive.Item>
                            <DropdownMenuPrimitive.Separator className="my-1 h-px bg-slate-100" />
                            <DropdownMenuPrimitive.Item
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:bg-red-50 focus:text-red-600 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                disabled={logout.isPending}
                                onSelect={() => logout.mutate()}
                            >
                                <LogOut className="size-4" />
                                {logout.isPending
                                    ? 'Đang đăng xuất...'
                                    : 'Đăng xuất'}
                            </DropdownMenuPrimitive.Item>
                        </DropdownMenuPrimitive.Content>
                    </DropdownMenuPrimitive.Portal>
                </DropdownMenuPrimitive.Root>
            </div>
        </header>
    );
}

function getInitials(fullName: string): string {
    return fullName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}
