'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { clearAuthenticatedQueries } from '@/lib/auth-query-cache';
import { clearObservedSession } from '@/lib/auth-session';
import { deleteAccount, type CurrentUser } from '@/services/auth.service';

interface ApiErrorResponse {
    error?: { message?: string | string[] };
}

export function DangerZoneSettings({ user }: { user?: CurrentUser }) {
    const [open, setOpen] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const queryClient = useQueryClient();
    const router = useRouter();
    const googleOnly = user?.hasPassword === false;

    const mutation = useMutation({
        mutationFn: deleteAccount,
        onSuccess: async () => {
            clearObservedSession();
            await clearAuthenticatedQueries(queryClient);
            setOpen(false);
            router.replace('/');
            toast.success('Tài khoản của bạn đã được xóa.');
        },
        onError: (error) => {
            const message = axios.isAxiosError<ApiErrorResponse>(error)
                ? error.response?.data?.error?.message
                : undefined;
            toast.error('Không thể xóa tài khoản', {
                description: Array.isArray(message)
                    ? message[0]
                    : (message ?? 'Vui lòng kiểm tra kết nối và thử lại.'),
            });
        },
    });

    const resetDialog = () => {
        setConfirmation('');
        setCurrentPassword('');
    };

    return (
        <SettingsSection
            title="Khu vực nguy hiểm"
            description="Các thao tác không thể hoàn tác đối với tài khoản."
            icon={Trash2}
            tone="danger"
        >
            <SettingsRow
                label="Xóa tài khoản"
                description="Vô hiệu hóa tài khoản Interviewly và chặn quyền truy cập vào dữ liệu của bạn."
                icon={Trash2}
            >
                <div className="flex flex-col items-stretch gap-2 md:items-end">
                    <Button
                        variant="destructive"
                        disabled={!user || googleOnly}
                        onClick={() => setOpen(true)}
                        className="h-10 w-full rounded-sm border !border-red-500 font-bold md:w-auto"
                    >
                        <Trash2 className="size-4" />
                        Xóa tài khoản
                    </Button>
                    {googleOnly && (
                        <p className="text-right text-xs font-medium text-slate-500">
                            Tài khoản Google cần xác thực lại trước khi xóa.
                        </p>
                    )}
                </div>
            </SettingsRow>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (mutation.isPending) return;
                    setOpen(nextOpen);
                    if (!nextOpen) resetDialog();
                }}
            >
                <DialogContent className="max-w-md border-red-100 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <Trash2 className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <DialogTitle>Xóa tài khoản của bạn?</DialogTitle>
                            <DialogDescription className="mt-1.5">
                                Tài khoản sẽ bị vô hiệu hóa và mọi phiên đăng
                                nhập sẽ kết thúc. Thao tác này không thể hoàn
                                tác.
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="mt-5 space-y-4">
                        <label className="block space-y-2 text-sm font-bold text-slate-800">
                            <span>Mật khẩu hiện tại</span>
                            <PasswordInput
                                value={currentPassword}
                                onChange={(event) =>
                                    setCurrentPassword(event.target.value)
                                }
                                autoComplete="current-password"
                                disabled={mutation.isPending}
                            />
                        </label>
                        <label className="block space-y-2 text-sm font-bold text-slate-800">
                            <span>
                                Nhập{' '}
                                <strong className="text-red-600">DELETE</strong>{' '}
                                để xác nhận
                            </span>
                            <Input
                                value={confirmation}
                                onChange={(event) =>
                                    setConfirmation(event.target.value)
                                }
                                autoComplete="off"
                                disabled={mutation.isPending}
                            />
                        </label>
                    </div>

                    <DialogFooter className="mt-6">
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                disabled={mutation.isPending}
                                className="!border-primary text-primary hover:!border-primary hover:text-primary hover:bg-primary/10 h-10 rounded-sm font-bold"
                            >
                                Hủy
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={
                                mutation.isPending ||
                                confirmation !== 'DELETE' ||
                                currentPassword.length === 0
                            }
                            aria-busy={mutation.isPending}
                            onClick={() =>
                                mutation.mutate({
                                    confirmation: 'DELETE',
                                    currentPassword,
                                })
                            }
                            className="h-10 rounded-sm !border-red-500 font-bold"
                        >
                            {mutation.isPending && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            Xóa tài khoản
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SettingsSection>
    );
}
