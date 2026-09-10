'use client';

import {
    KeyRound,
    Laptop,
    Link2,
    LockKeyhole,
    Mail,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

import {
    ChangePasswordDialog,
    SessionsDialog,
} from '@/components/settings/account-security-dialogs';
import {
    ComingSoon,
    SettingsToggle,
} from '@/components/settings/settings-controls';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CurrentUser } from '@/services/auth.service';

export function AccountSecuritySettings({
    user,
    isLoading,
}: {
    user?: CurrentUser;
    isLoading: boolean;
}) {
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [sessionsOpen, setSessionsOpen] = useState(false);
    const googleConnected =
        user?.connectedProviders?.includes('GOOGLE') ?? false;

    return (
        <SettingsSection
            title="Tài khoản và bảo mật"
            description="Quản lý tài khoản và các lớp bảo vệ của bạn."
            icon={ShieldCheck}
        >
            <SettingsRow
                label="Email"
                description="Địa chỉ email được liên kết với tài khoản của bạn."
                icon={Mail}
            >
                <Input
                    aria-label="Email tài khoản, chỉ đọc"
                    type="email"
                    value={isLoading ? 'Đang tải...' : (user?.email ?? '')}
                    placeholder="Không thể tải email"
                    readOnly
                    disabled
                    className="h-11 rounded-xl bg-slate-50 disabled:opacity-100"
                />
            </SettingsRow>

            <SettingsRow
                label={user?.hasPassword ? 'Mật khẩu' : 'Thiết lập mật khẩu'}
                description={
                    user?.hasPassword
                        ? 'Thay đổi mật khẩu để duy trì an toàn cho tài khoản.'
                        : 'Tài khoản này hiện đăng nhập bằng Google và chưa có mật khẩu.'
                }
                icon={KeyRound}
            >
                <div className="flex w-full flex-col items-stretch gap-2 md:items-end">
                    {user?.hasPassword ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="text-primary !border-primary hover:bg-primary/10 hover:text-primary h-10 min-w-36 rounded-sm font-bold"
                            onClick={() => setPasswordOpen(true)}
                        >
                            Đổi mật khẩu
                        </Button>
                    ) : (
                        <UnavailableAction
                            label="Thiết lập mật khẩu"
                            reason="Thiết lập mật khẩu cho tài khoản Google cần một luồng xác minh riêng."
                        />
                    )}
                </div>
            </SettingsRow>

            <SettingsRow
                label="Tài khoản Google"
                description="Quản lý phương thức đăng nhập bằng Google."
                icon={Link2}
            >
                <div className="flex w-full flex-col items-stretch gap-2 md:items-end">
                    <div className="flex items-center justify-end gap-2">
                        <span
                            className={
                                googleConnected
                                    ? 'rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700'
                                    : 'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600'
                            }
                        >
                            {googleConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            disabled
                            aria-label={`${googleConnected ? 'Quản lý' : 'Kết nối'} tài khoản Google. Chức năng chưa khả dụng.`}
                            className="min-w-24"
                        >
                            {googleConnected ? 'Quản lý' : 'Kết nối'}
                        </Button>
                    </div>
                    <p className="text-right text-xs font-medium text-slate-500">
                        Liên kết và hủy liên kết an toàn sẽ được hỗ trợ sau.
                    </p>
                </div>
            </SettingsRow>

            <SettingsRow
                label="Phiên đang hoạt động"
                description="Xem những thiết bị và trình duyệt đang đăng nhập."
                icon={Laptop}
            >
                <div className="flex w-full flex-col items-stretch gap-2 md:items-end">
                    <Button
                        type="button"
                        variant="outline"
                        className="text-primary !border-primary hover:bg-primary/10 hover:text-primary h-10 min-w-36 rounded-sm font-bold"
                        onClick={() => setSessionsOpen(true)}
                    >
                        Quản lý phiên
                    </Button>
                </div>
            </SettingsRow>

            <SettingsRow
                layout="inline"
                label="Xác thực hai bước"
                description="Bổ sung một lớp xác minh khi đăng nhập tài khoản."
                icon={LockKeyhole}
            >
                <div className="flex items-center justify-end gap-3">
                    <ComingSoon />
                    <SettingsToggle
                        label="Xác thực hai bước, sắp ra mắt"
                        checked={false}
                        disabled
                    />
                </div>
            </SettingsRow>
            <ChangePasswordDialog
                open={passwordOpen}
                onOpenChange={setPasswordOpen}
            />
            <SessionsDialog
                open={sessionsOpen}
                onOpenChange={setSessionsOpen}
            />
        </SettingsSection>
    );
}

function UnavailableAction({
    label,
    reason,
}: {
    label: string;
    reason: string;
}) {
    return (
        <div className="flex w-full flex-col items-stretch gap-2 md:items-end">
            <div className="flex items-center justify-end gap-2">
                <ComingSoon />
                <Button
                    type="button"
                    variant="outline"
                    disabled
                    aria-label={`${label}. ${reason}`}
                    className="min-w-32"
                >
                    {label}
                </Button>
            </div>
            <p className="text-right text-xs font-medium text-slate-500">
                {reason}
            </p>
        </div>
    );
}
