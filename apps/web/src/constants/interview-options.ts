import type { InterviewType } from '@/types/interview';

export const INTERVIEW_TYPE_OPTIONS: ReadonlyArray<{
    value: InterviewType;
    label: string;
}> = [
    { value: 'HR', label: 'Phỏng vấn nhân sự' },
    { value: 'BEHAVIORAL', label: 'Phỏng vấn hành vi' },
    { value: 'TECHNICAL', label: 'Phỏng vấn kỹ thuật' },
    { value: 'CODING', label: 'Phỏng vấn lập trình' },
    { value: 'SYSTEM_DESIGN', label: 'Phỏng vấn thiết kế hệ thống' },
    { value: 'FULL', label: 'Phỏng vấn đầy đủ' },
];

export function getInterviewTypeLabel(type: InterviewType): string {
    return (
        INTERVIEW_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
        type
    );
}
