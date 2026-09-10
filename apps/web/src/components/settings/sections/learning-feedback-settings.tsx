'use client';

import { BookOpenCheck, ListChecks, MessageSquareText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    SettingsCheckbox,
    SettingsSegmentedControl,
    SettingsSelect,
} from '@/components/settings/settings-controls';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { useUpdateSettings } from '@/hooks/settings';
import type {
    ContentPreference,
    FeedbackDetail,
    LearningAndFeedbackSettings as LearningAndFeedbackData,
    LearningStyle,
} from '@/types/settings';

const learningStyleOptions = [
    { value: 'LEARN_BY_DOING', label: 'Học qua thực hành' },
    { value: 'LEARN_BY_READING', label: 'Học qua đọc hiểu' },
    { value: 'LEARN_BY_WATCHING', label: 'Học qua quan sát' },
    { value: 'MIXED', label: 'Kết hợp nhiều phương pháp' },
] as const;

const feedbackOptions = [
    { value: 'CONCISE', label: 'Ngắn gọn' },
    { value: 'STANDARD', label: 'Tiêu chuẩn' },
    { value: 'DETAILED', label: 'Chi tiết' },
] as const;

const contentOptions: readonly {
    value: ContentPreference;
    label: string;
}[] = [
    {
        value: 'DATA_STRUCTURES_ALGORITHMS',
        label: 'Cấu trúc dữ liệu & Thuật toán',
    },
    { value: 'SYSTEM_DESIGN', label: 'Thiết kế hệ thống' },
    { value: 'FRONTEND_FRAMEWORKS', label: 'Frontend Frameworks' },
    { value: 'BEHAVIORAL_QUESTIONS', label: 'Câu hỏi hành vi' },
    { value: 'CODING_CHALLENGES', label: 'Thử thách lập trình' },
    { value: 'RESUME_PORTFOLIO', label: 'CV & Portfolio' },
];

export function LearningFeedbackSettings({
    data,
}: {
    data: LearningAndFeedbackData;
}) {
    const updateSettings = useUpdateSettings();
    const [pendingValues, setPendingValues] = useState<
        Partial<LearningAndFeedbackData>
    >({});
    const contentValueRef = useRef(data.contentPreferences);
    const confirmedContentValueRef = useRef(data.contentPreferences);
    const contentQueueRef = useRef(Promise.resolve());
    const pendingContentUpdatesRef = useRef(0);

    useEffect(() => {
        if (pendingContentUpdatesRef.current === 0) {
            contentValueRef.current = data.contentPreferences;
            confirmedContentValueRef.current = data.contentPreferences;
        }
    }, [data.contentPreferences]);

    const isPending = (field: keyof LearningAndFeedbackData) =>
        Object.prototype.hasOwnProperty.call(pendingValues, field);

    const showSaveError = () => {
        toast.error('Không thể lưu tùy chọn học tập', {
            description:
                'Thay đổi chưa được lưu. Vui lòng kiểm tra kết nối và thử lại.',
        });
    };

    const updatePreference = async <K extends keyof LearningAndFeedbackData>(
        field: K,
        value: LearningAndFeedbackData[K],
    ) => {
        if (isPending(field)) return;

        setPendingValues((current) => ({ ...current, [field]: value }));

        try {
            await updateSettings.mutateAsync({
                learningAndFeedback: { [field]: value },
            });
        } catch {
            showSaveError();
        } finally {
            setPendingValues((current) => {
                const next = { ...current };
                delete next[field];
                return next;
            });
        }
    };

    const toggleContentPreference = (
        preference: ContentPreference,
        checked: boolean,
    ) => {
        const current = contentValueRef.current;
        const next = checked
            ? Array.from(new Set([...current, preference]))
            : current.filter((value) => value !== preference);

        contentValueRef.current = next;
        pendingContentUpdatesRef.current += 1;
        setPendingValues((values) => ({
            ...values,
            contentPreferences: next,
        }));

        contentQueueRef.current = contentQueueRef.current
            .catch(() => undefined)
            .then(async () => {
                try {
                    const settings = await updateSettings.mutateAsync({
                        learningAndFeedback: { contentPreferences: next },
                    });
                    confirmedContentValueRef.current =
                        settings.learningAndFeedback.contentPreferences;
                } catch {
                    showSaveError();
                } finally {
                    pendingContentUpdatesRef.current -= 1;

                    if (pendingContentUpdatesRef.current === 0) {
                        contentValueRef.current =
                            confirmedContentValueRef.current;
                        setPendingValues((values) => {
                            const updated = { ...values };
                            delete updated.contentPreferences;
                            return updated;
                        });
                    }
                }
            });
    };

    const learningStyle =
        pendingValues.learningStyle !== undefined
            ? pendingValues.learningStyle
            : data.learningStyle;
    const contentPreferences =
        pendingValues.contentPreferences ?? data.contentPreferences;
    const feedbackDetail =
        pendingValues.feedbackDetail !== undefined
            ? pendingValues.feedbackDetail
            : data.feedbackDetail;

    return (
        <SettingsSection
            title="Học tập và phản hồi"
            description="Cá nhân hóa trải nghiệm học tập và cách bạn nhận phản hồi."
            icon={BookOpenCheck}
        >
            <SettingsRow
                label="Phong cách học tập"
                description="Chọn cách học phù hợp nhất với bạn."
                icon={BookOpenCheck}
            >
                <SettingsSelect
                    label="Phong cách học tập"
                    placeholder="Chọn phong cách học"
                    value={learningStyle}
                    options={learningStyleOptions}
                    disabled={isPending('learningStyle')}
                    loading={isPending('learningStyle')}
                    onValueChange={(value) =>
                        void updatePreference(
                            'learningStyle',
                            value as LearningStyle,
                        )
                    }
                />
            </SettingsRow>

            <SettingsRow
                label="Nội dung ưu tiên"
                description="Chọn những chủ đề bạn muốn tập trung."
                icon={ListChecks}
            >
                <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-1 min-[380px]:grid-cols-2">
                    {contentOptions.map((option) => (
                        <SettingsCheckbox
                            key={option.value}
                            label={option.label}
                            checked={contentPreferences.includes(option.value)}
                            onCheckedChange={(checked) =>
                                toggleContentPreference(option.value, checked)
                            }
                        />
                    ))}
                </div>
            </SettingsRow>

            <SettingsRow
                label="Mức độ chi tiết của phản hồi"
                description="Chọn mức độ chi tiết bạn muốn nhận sau mỗi câu trả lời."
                icon={MessageSquareText}
            >
                <SettingsSegmentedControl
                    label="Mức độ chi tiết của phản hồi"
                    value={feedbackDetail}
                    options={feedbackOptions}
                    disabled={isPending('feedbackDetail')}
                    loading={isPending('feedbackDetail')}
                    onValueChange={(value) =>
                        void updatePreference(
                            'feedbackDetail',
                            value as FeedbackDetail,
                        )
                    }
                />
            </SettingsRow>
        </SettingsSection>
    );
}
