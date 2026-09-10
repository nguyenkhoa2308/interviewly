'use client';

import axios from 'axios';
import { Laptop, LoaderCircle, LogOut, MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import {
    useChangePassword,
    useRevokeOtherSessions,
    useRevokeSession,
} from '@/hooks/auth/use-auth-mutations';
import { sessionKeys, useSessions } from '@/hooks/auth/use-sessions';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

interface ApiErrorResponse {
    error?: { message?: string | string[] };
}

function errorMessage(error: unknown) {
    if (!axios.isAxiosError<ApiErrorResponse>(error))
        return 'Đã có lỗi xảy ra.';
    const message = error.response?.data?.error?.message;
    return Array.isArray(message)
        ? message[0]
        : (message ?? 'Đã có lỗi xảy ra.');
}

function ModalFrame({
    open,
    onOpenChange,
    title,
    description,
    children,
    maxWidth = 'max-w-lg',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    children: React.ReactNode;
    maxWidth?: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={maxWidth} showCloseButton>
                <header className="sticky top-0 z-10 flex items-start justify-between border-b border-violet-100 bg-white/95 px-6 py-5 backdrop-blur">
                    <DialogHeader className="pr-10">
                        <DialogTitle className="text-xl">{title}</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            {description}
                        </DialogDescription>
                    </DialogHeader>
                </header>
                {children}
            </DialogContent>
        </Dialog>
    );
}

export function ChangePasswordDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const mutation = useChangePassword();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');

    const close = (nextOpen: boolean) => {
        if (mutation.isPending) return;
        onOpenChange(nextOpen);
        if (!nextOpen) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmation('');
        }
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (newPassword !== confirmation) {
            toast.error('Mật khẩu xác nhận chưa khớp.');
            return;
        }
        try {
            await mutation.mutateAsync({ currentPassword, newPassword });
            toast.success('Đổi mật khẩu thành công', {
                description:
                    'Các thiết bị khác đã được đăng xuất để bảo vệ tài khoản.',
            });
            close(false);
        } catch (error) {
            toast.error('Không thể đổi mật khẩu', {
                description: errorMessage(error),
            });
        }
    };

    return (
        <ModalFrame
            open={open}
            onOpenChange={close}
            title="Đổi mật khẩu"
            description="Mật khẩu mới nên khác với những mật khẩu bạn từng sử dụng."
        >
            <form className="space-y-5 p-6" onSubmit={submit}>
                <div className="space-y-2">
                    <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
                    <PasswordInput
                        id="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        className="mt-2 h-10"
                        tabIndex={1}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-password">Mật khẩu mới</Label>
                    <PasswordInput
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        showStrength
                        required
                        className="mt-2 h-10"
                        tabIndex={2}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                        Xác nhận mật khẩu mới
                    </Label>
                    <PasswordInput
                        id="confirm-password"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        autoComplete="new-password"
                        required
                        className="mt-2 h-10"
                        tabIndex={3}
                    />
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => close(false)}
                        disabled={mutation.isPending}
                        className="!border-primary text-primary hover:text-primary hover:bg-primary/10 h-10 min-w-20 rounded-sm font-bold"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        disabled={
                            mutation.isPending ||
                            !currentPassword ||
                            !newPassword ||
                            !confirmation
                        }
                        className="h-10 min-w-20 rounded-sm font-bold"
                    >
                        {mutation.isPending && (
                            <LoaderCircle className="size-4 animate-spin" />
                        )}
                        Lưu mật khẩu
                    </Button>
                </div>
            </form>
        </ModalFrame>
    );
}

export function SessionsDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const queryClient = useQueryClient();
    const sessions = useSessions(open);
    const revoke = useRevokeSession();
    const revokeOthers = useRevokeOtherSessions();
    const busy = revoke.isPending || revokeOthers.isPending;

    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    };

    const removeSession = async (id: string) => {
        try {
            await revoke.mutateAsync(id);
            await refresh();
            toast.success('Đã đăng xuất thiết bị.');
        } catch (error) {
            toast.error('Không thể thu hồi phiên', {
                description: errorMessage(error),
            });
        }
    };

    const removeOthers = async () => {
        try {
            await revokeOthers.mutateAsync();
            await refresh();
            toast.success('Đã đăng xuất khỏi các thiết bị khác.');
        } catch (error) {
            toast.error('Không thể thu hồi các phiên', {
                description: errorMessage(error),
            });
        }
    };

    return (
        <ModalFrame
            open={open}
            onOpenChange={onOpenChange}
            title="Phiên đăng nhập"
            description="Kiểm tra và đăng xuất những thiết bị bạn không còn sử dụng."
            maxWidth="max-w-2xl"
        >
            <div className="p-6">
                {sessions.isPending ? (
                    <div
                        className="space-y-3"
                        aria-label="Đang tải phiên đăng nhập"
                    >
                        {[1, 2].map((item) => (
                            <div
                                key={item}
                                className="h-24 animate-pulse rounded-xl bg-slate-100"
                            />
                        ))}
                    </div>
                ) : sessions.isError ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                        Không thể tải danh sách phiên. Vui lòng thử lại.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.data?.map((session) => (
                            <article
                                key={session.id}
                                className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                            >
                                <div className="bg-primary/8 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                    {session.isCurrent ? (
                                        <MonitorSmartphone className="size-5" />
                                    ) : (
                                        <Laptop className="size-5" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-bold text-slate-900">
                                            {describeDevice(session.userAgent)}
                                        </p>
                                        {session.isCurrent && (
                                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                                Thiết bị này
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                        {session.ipAddress ||
                                            'Không rõ địa chỉ IP'}{' '}
                                        · Hoạt động{' '}
                                        {formatDate(
                                            session.lastUsedAt ??
                                                session.createdAt,
                                        )}
                                    </p>
                                </div>
                                {!session.isCurrent && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy}
                                        onClick={() =>
                                            void removeSession(session.id)
                                        }
                                        className="!border-primary text-primary hover:text-primary hover:bg-priamry/10 h-10 rounded-sm"
                                    >
                                        <LogOut className="size-4" /> Đăng xuất
                                    </Button>
                                )}
                            </article>
                        ))}
                    </div>
                )}
                <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={
                            busy ||
                            !sessions.data?.some((item) => !item.isCurrent)
                        }
                        onClick={() => void removeOthers()}
                        className="!border-primary text-primary hover:text-primary hover:bg-priamry/10 h-12 rounded-sm"
                    >
                        {busy && (
                            <LoaderCircle className="size-4 animate-spin" />
                        )}
                        Đăng xuất tất cả thiết bị khác
                    </Button>
                </div>
            </div>
        </ModalFrame>
    );
}

function describeDevice(userAgent: string | null) {
    if (!userAgent) return 'Thiết bị không xác định';
    const browser = userAgent.includes('Edg/')
        ? 'Microsoft Edge'
        : userAgent.includes('Chrome/')
          ? 'Google Chrome'
          : userAgent.includes('Firefox/')
            ? 'Mozilla Firefox'
            : userAgent.includes('Safari/')
              ? 'Safari'
              : 'Trình duyệt';
    const os = userAgent.includes('Windows')
        ? 'Windows'
        : userAgent.includes('Mac OS')
          ? 'macOS'
          : userAgent.includes('Android')
            ? 'Android'
            : userAgent.includes('iPhone') || userAgent.includes('iPad')
              ? 'iOS'
              : 'thiết bị khác';
    return `${browser} trên ${os}`;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}
