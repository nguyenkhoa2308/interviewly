import {
    Database,
    Download,
    FolderCog,
    ShieldCheck,
    type LucideIcon,
} from 'lucide-react';

import { ComingSoon } from '@/components/settings/settings-controls';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Button } from '@/components/ui/button';

interface PrivacyDataAction {
    key: 'exportData' | 'manageInterviewData';
    label: string;
    description: string;
    buttonLabel: string;
    icon: LucideIcon;
    buttonIcon: LucideIcon;
    unavailableReason: string;
}

const privacyDataActions: readonly PrivacyDataAction[] = [
    {
        key: 'exportData',
        label: 'Xuất dữ liệu của bạn',
        description: 'Tải xuống một bản sao dữ liệu Interviewly của bạn.',
        buttonLabel: 'Xuất dữ liệu',
        icon: Database,
        buttonIcon: Download,
        unavailableReason: 'Tính năng xuất dữ liệu sẽ sớm được hỗ trợ.',
    },
    {
        key: 'manageInterviewData',
        label: 'Quản lý dữ liệu phỏng vấn',
        description:
            'Xem hoặc xóa lịch sử phỏng vấn, bản ghi và báo cáo của bạn.',
        buttonLabel: 'Quản lý dữ liệu',
        icon: FolderCog,
        buttonIcon: FolderCog,
        unavailableReason:
            'Trang quản lý lịch sử phỏng vấn chưa được hoàn thiện.',
    },
];

export function PrivacyDataSettings() {
    return (
        <SettingsSection
            title="Quyền riêng tư và dữ liệu"
            description="Kiểm soát dữ liệu và quyền riêng tư của bạn."
            icon={ShieldCheck}
        >
            {privacyDataActions.map((action) => (
                <PrivacyDataRow key={action.key} action={action} />
            ))}
        </SettingsSection>
    );
}

function PrivacyDataRow({ action }: { action: PrivacyDataAction }) {
    const ButtonIcon = action.buttonIcon;

    return (
        <SettingsRow
            label={action.label}
            description={action.description}
            icon={action.icon}
        >
            <div className="flex w-full flex-col items-stretch gap-2 md:items-end">
                <div className="flex items-center justify-end gap-2">
                    <ComingSoon />
                    <Button
                        variant="outline"
                        disabled
                        aria-label={`${action.buttonLabel}. ${action.unavailableReason}`}
                        className="min-w-36 md:w-auto"
                    >
                        <ButtonIcon className="size-4" />
                        {action.buttonLabel}
                    </Button>
                </div>
                <p className="text-right text-xs font-medium text-slate-500">
                    {action.unavailableReason}
                </p>
            </div>
        </SettingsRow>
    );
}
