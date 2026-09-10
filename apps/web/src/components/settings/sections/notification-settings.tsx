import {
    BellRing,
    CalendarClock,
    ClipboardCheck,
    GraduationCap,
    Mail,
    Megaphone,
    MonitorDot,
    type LucideIcon,
} from 'lucide-react';

import {
    ComingSoon,
    SettingsToggle,
} from '@/components/settings/settings-controls';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';

interface NotificationOption {
    key:
        | 'emailNotifications'
        | 'inAppNotifications'
        | 'interviewReminders'
        | 'interviewReports'
        | 'learningPlanReminders'
        | 'productUpdates';
    label: string;
    description: string;
    icon: LucideIcon;
}

const channelOptions: readonly NotificationOption[] = [
    {
        key: 'emailNotifications',
        label: 'Thông báo qua email',
        description: 'Nhận những cập nhật quan trọng qua email.',
        icon: Mail,
    },
    {
        key: 'inAppNotifications',
        label: 'Thông báo trong ứng dụng',
        description: 'Theo dõi thông báo ngay trong Interviewly.',
        icon: MonitorDot,
    },
];

const typeOptions: readonly NotificationOption[] = [
    {
        key: 'interviewReminders',
        label: 'Nhắc lịch phỏng vấn',
        description: 'Nhận lời nhắc trước các buổi phỏng vấn đã lên lịch.',
        icon: CalendarClock,
    },
    {
        key: 'interviewReports',
        label: 'Báo cáo phỏng vấn',
        description: 'Biết ngay khi báo cáo phỏng vấn của bạn đã sẵn sàng.',
        icon: ClipboardCheck,
    },
    {
        key: 'learningPlanReminders',
        label: 'Nhắc kế hoạch học tập',
        description: 'Duy trì tiến độ với mục tiêu và kế hoạch học tập.',
        icon: GraduationCap,
    },
    {
        key: 'productUpdates',
        label: 'Cập nhật sản phẩm',
        description: 'Nhận tin về các tính năng và cải tiến mới.',
        icon: Megaphone,
    },
];

export function NotificationSettings() {
    return (
        <SettingsSection
            title="Thông báo"
            description="Quản lý cách thức và thời điểm bạn nhận thông báo."
            icon={BellRing}
            headerAside={<ComingSoon />}
        >
            {channelOptions.map((option) => (
                <NotificationRow key={option.key} option={option} />
            ))}

            <div className="bg-slate-50/70 px-5 py-2.5 sm:px-6">
                <p className="text-xs font-extrabold tracking-wide text-slate-500">
                    Loại thông báo
                </p>
            </div>

            {typeOptions.map((option) => (
                <NotificationRow key={option.key} option={option} />
            ))}
        </SettingsSection>
    );
}

function NotificationRow({ option }: { option: NotificationOption }) {
    const descriptionId = `${option.key}-description`;

    return (
        <SettingsRow
            layout="inline"
            label={option.label}
            description={option.description}
            descriptionId={descriptionId}
            icon={option.icon}
        >
            <SettingsToggle
                label={`${option.label}, sắp ra mắt`}
                descriptionId={descriptionId}
                checked={false}
                disabled
            />
        </SettingsRow>
    );
}
