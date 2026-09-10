'use client';

import {
    Clock3,
    Code2,
    Gauge,
    SlidersHorizontal,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    SettingsSegmentedControl,
    SettingsSelect,
} from '@/components/settings/settings-controls';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { useUpdateSettings } from '@/hooks/settings';
import type {
    Difficulty,
    InterviewerStyle,
    InterviewPreferencesSettings as InterviewPreferencesData,
    InterviewType,
    SettingsDurationMinutes,
} from '@/types/settings';

const difficultyOptions = [
    { value: 'EASY', label: 'Dễ' },
    { value: 'MEDIUM', label: 'Trung bình' },
    { value: 'HARD', label: 'Khó' },
    { value: 'ADAPTIVE', label: 'Thích ứng' },
] as const;
const interviewTypeOptions = [
    { value: 'HR', label: 'Nhân sự' },
    { value: 'BEHAVIORAL', label: 'Hành vi' },
    { value: 'TECHNICAL', label: 'Kỹ thuật' },
    { value: 'CODING', label: 'Lập trình' },
    { value: 'SYSTEM_DESIGN', label: 'Thiết kế hệ thống' },
    { value: 'FULL', label: 'Phỏng vấn đầy đủ' },
] as const;
const interviewerStyleOptions = [
    { value: 'FRIENDLY', label: 'Thân thiện' },
    { value: 'PROFESSIONAL', label: 'Chuyên nghiệp' },
    { value: 'STRICT', label: 'Nghiêm khắc' },
] as const;
const durationOptions = [
    { value: 15, label: '15 phút' },
    { value: 30, label: '30 phút' },
    { value: 45, label: '45 phút' },
    { value: 60, label: '60 phút' },
] as const;

export function InterviewPreferencesSettings({
    data,
}: {
    data: InterviewPreferencesData;
}) {
    const updateSettings = useUpdateSettings();
    const [pendingValues, setPendingValues] = useState<
        Partial<InterviewPreferencesData>
    >({});

    const isPending = (field: keyof InterviewPreferencesData) =>
        Object.prototype.hasOwnProperty.call(pendingValues, field);

    const updatePreference = async <K extends keyof InterviewPreferencesData>(
        field: K,
        value: InterviewPreferencesData[K],
    ) => {
        if (isPending(field)) return;

        setPendingValues((current) => ({ ...current, [field]: value }));

        try {
            await updateSettings.mutateAsync({
                interviewPreferences: { [field]: value },
            });
        } catch {
            toast.error('Không thể lưu tùy chọn phỏng vấn', {
                description:
                    'Thay đổi chưa được lưu. Vui lòng kiểm tra kết nối và thử lại.',
            });
        } finally {
            setPendingValues((current) => {
                const next = { ...current };
                delete next[field];
                return next;
            });
        }
    };

    const difficulty =
        pendingValues.defaultDifficulty !== undefined
            ? pendingValues.defaultDifficulty
            : data.defaultDifficulty;
    const interviewType =
        pendingValues.defaultInterviewType !== undefined
            ? pendingValues.defaultInterviewType
            : data.defaultInterviewType;
    const interviewerStyle =
        pendingValues.interviewerStyle !== undefined
            ? pendingValues.interviewerStyle
            : data.interviewerStyle;
    const duration =
        pendingValues.defaultDurationMinutes ?? data.defaultDurationMinutes;

    return (
        <SettingsSection
            title="Tùy chọn phỏng vấn"
            description="Thiết lập trải nghiệm mặc định cho mỗi buổi luyện tập."
            icon={SlidersHorizontal}
        >
            <SettingsRow
                label="Độ khó mặc định"
                description="Mức độ câu hỏi được ưu tiên khi bắt đầu buổi mới."
                icon={Gauge}
            >
                <SettingsSegmentedControl
                    label="Độ khó mặc định"
                    value={difficulty}
                    options={difficultyOptions}
                    disabled={isPending('defaultDifficulty')}
                    loading={isPending('defaultDifficulty')}
                    onValueChange={(value) =>
                        void updatePreference(
                            'defaultDifficulty',
                            value as Difficulty,
                        )
                    }
                />
            </SettingsRow>
            <SettingsRow
                label="Loại phỏng vấn mặc định"
                description="Kịch bản được chọn sẵn khi bạn tạo buổi luyện tập."
                icon={Code2}
            >
                <SettingsSelect
                    label="Loại phỏng vấn mặc định"
                    value={interviewType}
                    options={interviewTypeOptions}
                    disabled={isPending('defaultInterviewType')}
                    loading={isPending('defaultInterviewType')}
                    onValueChange={(value) =>
                        void updatePreference(
                            'defaultInterviewType',
                            value as InterviewType,
                        )
                    }
                />
            </SettingsRow>
            <SettingsRow
                label="Phong cách người phỏng vấn"
                description="Điều chỉnh cách AI đặt câu hỏi và phản hồi với bạn."
                icon={UserRound}
            >
                <SettingsSegmentedControl
                    label="Phong cách người phỏng vấn"
                    value={interviewerStyle}
                    options={interviewerStyleOptions}
                    disabled={isPending('interviewerStyle')}
                    loading={isPending('interviewerStyle')}
                    onValueChange={(value) =>
                        void updatePreference(
                            'interviewerStyle',
                            value as InterviewerStyle,
                        )
                    }
                />
            </SettingsRow>
            <SettingsRow
                label="Thời lượng mặc định"
                description="Khoảng thời gian dự kiến cho mỗi buổi luyện tập."
                icon={Clock3}
            >
                <SettingsSegmentedControl
                    label="Thời lượng mặc định"
                    value={duration}
                    options={durationOptions}
                    disabled={isPending('defaultDurationMinutes')}
                    loading={isPending('defaultDurationMinutes')}
                    onValueChange={(value) =>
                        void updatePreference(
                            'defaultDurationMinutes',
                            value as SettingsDurationMinutes,
                        )
                    }
                />
            </SettingsRow>
        </SettingsSection>
    );
}
