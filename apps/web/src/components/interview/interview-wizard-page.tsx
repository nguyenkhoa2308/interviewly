'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    BriefcaseBusiness,
    CheckCircle2,
    CircleHelp,
    Clock3,
    Code2,
    FileSearch,
    FileText,
    ExternalLink,
    Search,
    Info,
    Settings2,
    Sparkles,
    Target,
    Trash2,
    TriangleAlert,
    UserRound,
    RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { InterviewWizardStepper } from '@/components/interview/interview-wizard-stepper';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { INTERVIEW_TYPE_OPTIONS } from '@/constants/interview-options';
import { formatFileSize } from '@/lib/cv-formatters';
import {
    useCreateInterview,
    useInterview,
    useInterviewOptions,
    usePreviewInterviewPlan,
} from '@/hooks/interview/use-interviews';
import type {
    CreateInterviewPayload,
    InterviewCvOption,
    InterviewJobOption,
    InterviewPlanData,
    InterviewPlanPreview,
    InterviewType,
} from '@/types/interview';

const durations = [15, 30, 45, 60] as const;
const questionCount = { 15: 5, 30: 8, 45: 11, 60: 14 } as const;
const levels = [
    ['INTERN', 'Thực tập sinh'],
    ['FRESHER', 'Fresher'],
    ['JUNIOR', 'Junior'],
    ['MIDDLE', 'Middle'],
    ['SENIOR', 'Senior'],
    ['LEAD', 'Lead'],
] as const;
const structureByType: Record<
    InterviewType,
    Array<[title: string, minutes: number]>
> = {
    TECHNICAL: [
        ['Mở đầu', 3],
        ['Kiến thức kỹ thuật', 13],
        ['Dự án và kinh nghiệm', 7],
        ['Hành vi', 5],
        ['Câu hỏi ứng viên', 2],
    ],
    CODING: [
        ['Mở đầu', 3],
        ['Lập trình', 15],
        ['Tư duy giải quyết vấn đề', 6],
        ['Trao đổi kỹ thuật', 4],
        ['Câu hỏi ứng viên', 2],
    ],
    SYSTEM_DESIGN: [
        ['Mở đầu', 3],
        ['Thiết kế hệ thống', 14],
        ['Kinh nghiệm kiến trúc', 7],
        ['Đánh đổi kỹ thuật', 4],
        ['Câu hỏi ứng viên', 2],
    ],
    BEHAVIORAL: [
        ['Mở đầu', 3],
        ['Kinh nghiệm', 7],
        ['Tình huống hành vi', 12],
        ['Phong cách làm việc', 6],
        ['Câu hỏi ứng viên', 2],
    ],
    HR: [
        ['Mở đầu', 3],
        ['Tổng quan kinh nghiệm', 8],
        ['Động lực và mục tiêu', 10],
        ['Mức độ phù hợp', 7],
        ['Câu hỏi ứng viên', 2],
    ],
    FULL: [
        ['Mở đầu', 3],
        ['Kỹ thuật', 10],
        ['Dự án và kinh nghiệm', 7],
        ['Hành vi', 8],
        ['Câu hỏi ứng viên', 2],
    ],
};

export function InterviewWizardPage() {
    const router = useRouter();
    const params = useSearchParams();
    const options = useInterviewOptions();
    const sourceId = params.get('from') ?? '';
    const sourceQuery = useInterview(sourceId);
    const source = sourceQuery.data;
    const create = useCreateInterview();
    const preview = usePreviewInterviewPlan();
    const [planPreview, setPlanPreview] = useState<InterviewPlanPreview | null>(
        null,
    );
    const [savedAs, setSavedAs] = useState<'draft' | 'created' | null>(null);
    const initialMatch = options.data?.matches.find(
        (item) => item.id === params.get('matchId'),
    );
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [type, setType] = useState<InterviewType | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [level, setLevel] = useState<string | null>(null);
    const [duration, setDuration] = useState<(typeof durations)[number] | null>(
        null,
    );
    const [cv, setCv] = useState<string | null>(null);
    const [jd, setJd] = useState<string | null>(null);
    const defaults = options.data?.defaults;
    const selectedType =
        type ?? source?.interviewType ?? defaults?.interviewType;
    const selectedRole =
        role ?? source?.targetRole ?? defaults?.targetRole ?? '';
    const selectedLevel = level ?? source?.targetLevel ?? defaults?.targetLevel;
    const selectedDuration = (duration ??
        source?.durationMinutes ??
        defaults?.durationMinutes) as (typeof durations)[number] | undefined;
    const cvId =
        cv ??
        source?.cv.id ??
        initialMatch?.cvId ??
        options.data?.cvs[0]?.id ??
        '';
    const jdId =
        jd ??
        source?.jobDescription.id ??
        initialMatch?.jobDescriptionId ??
        options.data?.jobDescriptions[0]?.id ??
        '';
    const selectedCv = options.data?.cvs.find((item) => item.id === cvId);
    const selectedJd = options.data?.jobDescriptions.find(
        (item) => item.id === jdId,
    );
    const match = useMemo(
        () =>
            options.data?.matches.find(
                (item) => item.cvId === cvId && item.jobDescriptionId === jdId,
            ),
        [cvId, jdId, options.data?.matches],
    );

    function buildPayload(): CreateInterviewPayload | null {
        if (
            !cvId ||
            !jdId ||
            !selectedType ||
            !selectedRole.trim() ||
            !selectedLevel ||
            !selectedDuration ||
            !defaults
        ) {
            toast.error('Vui lòng hoàn thành đầy đủ cấu hình phỏng vấn.');
            return null;
        }
        return {
            cvId,
            jobDescriptionId: jdId,
            cvJdMatchId: match?.id,
            interviewType: selectedType,
            difficulty: source?.difficulty ?? defaults.difficulty,
            durationMinutes: selectedDuration,
            questionCount: questionCount[selectedDuration],
            focusAreas: [],
            targetRole: selectedRole.trim(),
            targetLevel: selectedLevel,
        };
    }

    async function generatePreview() {
        const payload = buildPayload();
        if (!payload) return;
        try {
            const result = await preview.mutateAsync(payload);
            setPlanPreview(result);
            setStep(3);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể tạo bản xem trước kế hoạch.',
            );
        }
    }

    async function generate(saveAsDraft = false) {
        const payload = buildPayload();
        if (!payload || !planPreview) return;
        try {
            await create.mutateAsync({
                ...payload,
                previewToken: planPreview.previewToken,
                saveAsDraft,
            });
            toast.success(
                saveAsDraft
                    ? 'Đã lưu bản nháp phỏng vấn'
                    : 'Đã tạo buổi phỏng vấn',
            );
            setSavedAs(saveAsDraft ? 'draft' : 'created');
            router.replace('/interviews');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể tạo kế hoạch phỏng vấn.',
            );
        }
    }

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <PageBreadcrumb
                items={[
                    { label: 'Phỏng vấn', href: '/interviews' },
                    { label: 'Tạo buổi phỏng vấn' },
                ]}
            />
            <header className="mt-4">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                    Tạo buổi phỏng vấn mới
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
                    {step === 1
                        ? 'Thiết lập buổi phỏng vấn dựa trên CV, mô tả công việc và các tùy chọn của bạn.'
                        : step === 2
                          ? 'Chọn CV và mô tả công việc để AI cá nhân hóa kế hoạch.'
                          : 'Xem lại cấu hình và nguồn dữ liệu trước khi tạo kế hoạch phỏng vấn.'}
                </p>
            </header>
            <InterviewWizardStepper current={step} />

            {options.isPending || (sourceId && sourceQuery.isPending) ? (
                <WizardSkeleton />
            ) : options.isError || sourceQuery.isError ? (
                <LoadError onRetry={() => options.refetch()} />
            ) : step === 1 ? (
                <SetupStep
                    type={selectedType!}
                    role={selectedRole}
                    level={selectedLevel ?? ''}
                    duration={selectedDuration!}
                    setType={setType}
                    setRole={setRole}
                    setLevel={setLevel}
                    setDuration={setDuration}
                />
            ) : step === 2 ? (
                <ContextStep
                    cvs={options.data?.cvs ?? []}
                    jobs={options.data?.jobDescriptions ?? []}
                    cvId={cvId}
                    jdId={jdId}
                    selectedCv={selectedCv}
                    selectedJd={selectedJd}
                    match={match}
                    setCv={setCv}
                    setJd={setJd}
                />
            ) : (
                <ReviewStep
                    type={selectedType!}
                    role={selectedRole}
                    level={selectedLevel ?? ''}
                    duration={selectedDuration!}
                    cv={selectedCv}
                    job={selectedJd}
                    matchScore={match?.matchScore ?? null}
                    matchId={match?.id}
                    preview={planPreview!}
                    regenerating={preview.isPending || savedAs !== null}
                    onRegenerate={() => void generatePreview()}
                />
            )}

            {!options.isPending &&
                !options.isError &&
                (!sourceId || !sourceQuery.isPending) &&
                (!sourceId || !sourceQuery.isError) && (
                    <div
                        className={
                            'mt-7 flex items-center gap-3 border-t border-slate-200 pt-6 ' +
                            (step === 1 ? 'justify-end' : 'justify-between')
                        }
                    >
                        {step === 1 ? (
                            <Button
                                asChild
                                variant="outline"
                                className="h-12 rounded-lg px-6 font-bold"
                            >
                                <Link href="/interviews">Hủy</Link>
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                className="h-12 rounded-lg px-6 font-bold"
                                onClick={() => setStep(step === 3 ? 2 : 1)}
                            >
                                <ArrowLeft className="size-4" />
                                Quay lại
                            </Button>
                        )}
                        <div className="flex items-center gap-3">
                            {step === 3 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 rounded-lg px-5 font-bold"
                                    disabled={
                                        create.isPending ||
                                        preview.isPending ||
                                        savedAs !== null
                                    }
                                    onClick={() => void generate(true)}
                                >
                                    {savedAs === 'draft'
                                        ? 'Đã lưu bản nháp'
                                        : 'Lưu bản nháp'}
                                </Button>
                            )}
                            <Button
                                className="group h-12 min-w-36 rounded-lg px-6 font-bold shadow-[0_8px_22px_rgba(109,60,220,.18)]"
                                disabled={
                                    create.isPending ||
                                    preview.isPending ||
                                    savedAs !== null ||
                                    (step === 1 &&
                                        (!selectedRole.trim() ||
                                            !selectedLevel)) ||
                                    (step === 2 && (!cvId || !jdId))
                                }
                                onClick={() => {
                                    if (step === 1) setStep(2);
                                    else if (step === 2) void generatePreview();
                                    else void generate(false);
                                }}
                            >
                                {create.isPending || preview.isPending ? (
                                    <>
                                        <Sparkles className="size-4 animate-pulse" />
                                        {step === 2
                                            ? 'Đang tạo bản xem trước...'
                                            : 'Đang tạo...'}
                                    </>
                                ) : (
                                    <>
                                        {step < 3
                                            ? 'Tiếp tục'
                                            : savedAs === 'created'
                                              ? 'Đã tạo phỏng vấn'
                                              : savedAs === 'draft'
                                                ? 'Đã lưu bản nháp'
                                                : 'Tạo phỏng vấn'}
                                        <ArrowRight
                                            className="size-5 transition-transform group-hover:translate-x-0.5"
                                            strokeWidth={2.75}
                                        />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
        </main>
    );
}

type SetupProps = {
    type: InterviewType;
    role: string;
    level: string;
    duration: (typeof durations)[number];
    setType: (value: InterviewType) => void;
    setRole: (value: string) => void;
    setLevel: (value: string) => void;
    setDuration: (value: (typeof durations)[number]) => void;
};
function SetupStep(props: SetupProps) {
    const structure = structureByType[props.type];
    const structureIcons = [
        UserRound,
        Code2,
        BriefcaseBusiness,
        BarChart3,
        CircleHelp,
    ] as const;
    return (
        <section className="relative mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(54,44,89,.055)] sm:p-7 lg:p-8">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-violet-100/45 blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-5">
                <SectionHeading
                    icon={Settings2}
                    title="Thiết lập phỏng vấn"
                    description="Cấu hình thông tin cơ bản cho buổi luyện tập."
                />
                <span className="hidden rounded-full border border-violet-100 bg-violet-50/70 px-3 py-1.5 text-xs font-extrabold text-violet-700 sm:inline-flex">
                    Bước 1 · Thiết lập
                </span>
            </div>
            <div className="relative mt-8 grid gap-x-7 gap-y-6 lg:grid-cols-2">
                <Field label="Loại phỏng vấn">
                    <Select
                        value={props.type}
                        onValueChange={(value) =>
                            props.setType(value as InterviewType)
                        }
                    >
                        <SelectTrigger className="h-12 rounded-lg px-4">
                            <span className="flex min-w-0 items-center gap-3">
                                <Settings2 className="size-5 shrink-0 text-slate-600" />
                                <SelectValue />
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {INTERVIEW_TYPE_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InfoBox text="Loại phỏng vấn quyết định cách AI phân bổ chủ đề và dạng câu hỏi." />
                </Field>
                <Field label="Vai trò mục tiêu">
                    <div className="relative">
                        <Code2 className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-600" />
                        <Input
                            value={props.role}
                            onChange={(event) =>
                                props.setRole(event.target.value)
                            }
                            placeholder="Nhập vai trò bạn muốn luyện tập"
                            className="h-12 rounded-lg pr-4 pl-12"
                            maxLength={150}
                        />
                    </div>
                </Field>
                <Field label="Cấp độ mục tiêu">
                    <Select value={props.level} onValueChange={props.setLevel}>
                        <SelectTrigger className="h-12 rounded-lg px-4">
                            <span className="flex min-w-0 items-center gap-3">
                                <BarChart3 className="size-5 shrink-0 text-slate-600" />
                                <SelectValue />
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {levels.map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field label="Thời lượng phỏng vấn">
                    <Select
                        value={String(props.duration)}
                        onValueChange={(value) =>
                            props.setDuration(
                                Number(value) as SetupProps['duration'],
                            )
                        }
                    >
                        <SelectTrigger className="h-12 rounded-lg px-4">
                            <span className="flex min-w-0 items-center gap-3">
                                <Clock3 className="size-5 shrink-0 text-slate-600" />
                                <SelectValue />
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {durations.map((item) => (
                                <SelectItem key={item} value={String(item)}>
                                    {item} phút
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </div>
            <div className="relative mt-8 overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,rgba(248,246,255,.96),rgba(255,255,255,.98))] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2.5 text-base font-extrabold text-slate-950">
                            <span className="text-primary grid size-9 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-violet-100">
                                <Target className="size-5" strokeWidth={2.4} />
                            </span>
                            Cấu trúc dự kiến
                        </h3>
                        <p className="mt-2 text-sm font-medium text-slate-500">
                            Nhịp phỏng vấn được cân đối theo loại và thời lượng
                            bạn chọn.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm">
                        <Clock3 className="text-primary size-3.5" />
                        Tổng {props.duration} phút
                    </span>
                </div>
                <div className="relative mt-6 grid gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5 xl:gap-8">
                    {structure.map(([title, minutes], index) => {
                        const Icon = structureIcons[index];
                        const scaledMinutes = Math.max(
                            1,
                            Math.round((Number(minutes) * props.duration) / 30),
                        );
                        return (
                            <div
                                key={String(title)}
                                className="group relative flex min-h-20 items-center gap-3 rounded-xl border border-violet-100 bg-white p-3.5 shadow-[0_8px_20px_rgba(76,52,135,.055)] transition-[border-color,background-color,box-shadow] duration-300 ease-out hover:border-violet-200 hover:bg-violet-50/35 hover:shadow-[0_12px_28px_rgba(76,52,135,.1)] motion-reduce:transition-none md:min-h-32 md:flex-col md:items-stretch md:p-4 xl:min-h-36"
                            >
                                <span className="text-primary grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 ring-4 ring-white transition-[color,background-color,box-shadow] duration-300 ease-out group-hover:bg-violet-100 group-hover:shadow-[0_6px_16px_rgba(109,60,220,.12)] motion-reduce:transition-none">
                                    <Icon
                                        className="size-5"
                                        strokeWidth={2.25}
                                    />
                                </span>
                                <div className="min-w-0 flex-1 md:mt-auto">
                                    <p className="text-sm leading-5 font-extrabold text-slate-900">
                                        {title}
                                    </p>
                                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                        <Clock3 className="size-3.5 text-violet-400" />
                                        Khoảng {scaledMinutes} phút
                                    </p>
                                </div>
                                <span className="ml-auto self-start text-[11px] font-black tracking-[0.12em] text-violet-300 transition-colors duration-300 group-hover:text-violet-500 motion-reduce:transition-none md:absolute md:top-4 md:right-4">
                                    0{index + 1}
                                </span>
                                {index < structure.length - 1 && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-1/2 -right-7 z-20 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-violet-400 shadow-sm ring-1 ring-violet-100 xl:flex"
                                    >
                                        <ArrowRight
                                            className="size-4"
                                            strokeWidth={2.75}
                                        />
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

type ContextProps = {
    cvs: InterviewCvOption[];
    jobs: InterviewJobOption[];
    cvId: string;
    jdId: string;
    selectedCv?: InterviewCvOption;
    selectedJd?: InterviewJobOption;
    match?: {
        id: string;
        matchScore: number | null;
        strengths: Array<{ title?: string; description?: string }> | null;
        gaps: Array<{ title?: string; description?: string }> | null;
    };
    setCv: (id: string) => void;
    setJd: (id: string) => void;
};
function ContextStep(props: ContextProps) {
    const score = props.match?.matchScore;
    const roundedScore = score == null ? null : Math.round(score);
    const progressColor =
        roundedScore == null
            ? '#cbd5e1'
            : roundedScore >= 70
              ? '#22c55e'
              : roundedScore >= 45
                ? '#f59e0b'
                : '#ef4444';
    const matchLabel =
        roundedScore == null
            ? 'Chưa có đối chiếu'
            : roundedScore >= 80
              ? 'Rất phù hợp'
              : roundedScore >= 65
                ? 'Phù hợp tốt'
                : roundedScore >= 45
                  ? 'Phù hợp một phần'
                  : 'Cần xem xét thêm';
    const [cvSelectOpen, setCvSelectOpen] = useState(false);
    const [jdSelectOpen, setJdSelectOpen] = useState(false);
    return (
        <div className="mt-7 space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
                <SourceCard
                    icon={FileText}
                    title="Chọn CV"
                    description="CV đã phân tích sẽ cung cấp kỹ năng và kinh nghiệm của bạn."
                    href={
                        props.selectedCv
                            ? `/cvs/${props.selectedCv.id}`
                            : undefined
                    }
                >
                    {props.selectedCv && (
                        <DocumentSelection
                            kind="pdf"
                            title={props.selectedCv.originalFilename}
                            metadata={`PDF · ${formatFileSize(props.selectedCv.fileSize)}`}
                            onClear={() => props.setCv('')}
                        />
                    )}
                    {!props.selectedCv && (
                        <EmptySourceSelection
                            label="Chọn CV đã phân tích"
                            onClick={() => setCvSelectOpen(true)}
                        />
                    )}
                    {props.selectedCv && (
                        <ReadyNotice
                            text="CV đã được phân tích và sẵn sàng"
                            onReplace={() => setCvSelectOpen(true)}
                        />
                    )}
                </SourceCard>
                <SourceCard
                    icon={FileSearch}
                    title="Chọn mô tả công việc"
                    description="JD đã phân tích giúp câu hỏi bám sát vị trí ứng tuyển."
                    href={
                        props.selectedJd
                            ? `/job-descriptions/${props.selectedJd.id}`
                            : undefined
                    }
                >
                    {props.selectedJd && (
                        <DocumentSelection
                            kind="job"
                            title={props.selectedJd.title}
                            metadata={`Mô tả công việc${props.selectedJd.company ? ` · ${props.selectedJd.company}` : ''}`}
                            onClear={() => props.setJd('')}
                        />
                    )}
                    {!props.selectedJd && (
                        <EmptySourceSelection
                            label="Chọn mô tả công việc đã phân tích"
                            onClick={() => setJdSelectOpen(true)}
                        />
                    )}
                    {props.selectedJd && (
                        <ReadyNotice
                            text="Mô tả công việc đã được phân tích"
                            onReplace={() => setJdSelectOpen(true)}
                        />
                    )}
                </SourceCard>
            </div>
            <SourcePickerDialog
                type="cv"
                open={cvSelectOpen}
                onOpenChange={setCvSelectOpen}
                items={props.cvs}
                selectedId={props.cvId}
                onSelect={props.setCv}
            />
            <SourcePickerDialog
                type="job"
                open={jdSelectOpen}
                onOpenChange={setJdSelectOpen}
                items={props.jobs}
                selectedId={props.jdId}
                onSelect={props.setJd}
            />
            <div className="grid gap-4 xl:grid-cols-2">
                <AnalysisCard
                    title="Tóm tắt CV"
                    icon={Code2}
                    rows={[
                        [
                            props.selectedCv?.analysis.detectedLevel ??
                                'Chưa xác định',
                            'Cấp độ được nhận diện',
                        ],
                        [
                            `${props.selectedCv?.analysis.projects?.length ?? 0} dự án`,
                            'Dự án chính',
                        ],
                        [
                            (props.selectedCv?.analysis.extractedSkills ?? [])
                                .map((skill) => skill.name)
                                .filter(Boolean)
                                .join(', ') || 'Chưa có dữ liệu',
                            'Công nghệ chính',
                        ],
                        [
                            props.selectedCv?.analysis.education?.[0]
                                ?.institution ?? 'Chưa có dữ liệu',
                            'Học vấn',
                        ],
                    ]}
                />
                <AnalysisCard
                    title="Tóm tắt công việc"
                    icon={BriefcaseBusiness}
                    rows={[
                        [
                            props.selectedJd?.analysis.detectedRole ??
                                props.selectedJd?.title ??
                                'Chưa chọn JD',
                            'Vai trò được nhận diện',
                        ],
                        [
                            props.selectedJd?.analysis.seniority ??
                                'Chưa xác định',
                            'Cấp độ kinh nghiệm',
                        ],
                        [
                            Array.from(
                                new Set([
                                    ...(props.selectedJd?.analysis
                                        .requiredSkills ?? []),
                                    ...(props.selectedJd?.analysis
                                        .preferredSkills ?? []),
                                ]),
                            ).join(', ') || 'Chưa có dữ liệu',
                            'Kỹ năng yêu cầu',
                        ],
                        [
                            props.selectedJd?.company ?? 'Chưa cập nhật',
                            'Công ty',
                        ],
                    ]}
                />
            </div>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid lg:grid-cols-[1.45fr_.8fr_.8fr]">
                    <div className="p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                            <span className="text-primary grid size-10 shrink-0 place-items-center rounded-lg bg-violet-50">
                                <Target className="size-5" strokeWidth={2.5} />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-extrabold text-slate-950">
                                        Đối chiếu CV và JD
                                    </h2>
                                    {props.match && (
                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                                            Hoàn tất
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                    Mức độ phù hợp tổng thể giữa CV và mô tả
                                    công việc.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center gap-5">
                            <div
                                className="grid size-[92px] shrink-0 place-items-center rounded-full p-[8px]"
                                style={{
                                    background: `conic-gradient(${progressColor} ${Math.max(0, Math.min(roundedScore ?? 0, 100))}%, #e2e8f0 0)`,
                                }}
                                aria-label={
                                    roundedScore == null
                                        ? 'Chưa có điểm phù hợp'
                                        : `Điểm phù hợp ${roundedScore}%`
                                }
                            >
                                <div className="grid size-full place-items-center rounded-full bg-white shadow-inner">
                                    <span className="text-xl font-black tracking-tight text-slate-950">
                                        {roundedScore == null
                                            ? '—'
                                            : `${roundedScore}%`}
                                    </span>
                                </div>
                            </div>
                            <div className="min-w-0">
                                <p className="text-base font-extrabold text-slate-950">
                                    {matchLabel}
                                </p>
                                <p className="mt-1.5 text-sm leading-5 text-slate-500">
                                    {props.match
                                        ? 'Kết quả này giúp AI cân bằng câu hỏi xác minh điểm mạnh và đào sâu những nội dung còn thiếu bằng chứng.'
                                        : 'Bạn vẫn có thể tiếp tục, nhưng kế hoạch sẽ không có ngữ cảnh đối chiếu CV–JD.'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <MatchColumn
                        icon={CheckCircle2}
                        title="Điểm mạnh chính"
                        items={
                            props.match?.strengths?.map(
                                (item) => item.title ?? item.description ?? '',
                            ) ?? []
                        }
                        emptyText="Chưa có điểm mạnh từ kết quả đối chiếu."
                        tone="success"
                    />
                    <MatchColumn
                        icon={TriangleAlert}
                        title="Khoảng trống tiềm năng"
                        items={
                            props.match?.gaps?.map(
                                (item) => item.title ?? item.description ?? '',
                            ) ?? []
                        }
                        emptyText="Không có khoảng trống đáng chú ý."
                        tone="warning"
                    />
                </div>
            </section>
        </div>
    );
}

function ReviewStep({
    type,
    role,
    level,
    duration,
    cv,
    job,
    matchScore,
    matchId,
    preview,
    regenerating,
    onRegenerate,
}: {
    type: InterviewType;
    role: string;
    level: string;
    duration: (typeof durations)[number];
    cv?: InterviewCvOption;
    job?: InterviewJobOption;
    matchScore: number | null;
    matchId?: string;
    preview: InterviewPlanPreview;
    regenerating: boolean;
    onRegenerate: () => void;
}) {
    const typeLabel =
        INTERVIEW_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
        type;
    const levelLabel = levels.find(([value]) => value === level)?.[1] ?? level;
    const totalQuestions = preview.planData.sections.reduce(
        (total, section) => total + section.questions.length,
        0,
    );

    return (
        <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(54,44,89,.05)]">
                <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <SectionHeading
                        icon={Settings2}
                        title="Bản xem trước kế hoạch phỏng vấn"
                        description="Kế hoạch được AI cá nhân hóa từ CV, JD và kết quả đối chiếu."
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="text-primary h-10 shrink-0 self-start rounded-lg border-violet-200 font-bold sm:self-auto"
                        disabled={regenerating}
                        onClick={onRegenerate}
                    >
                        <RefreshCcw
                            className={
                                regenerating ? 'size-4 animate-spin' : 'size-4'
                            }
                        />
                        Tạo lại kế hoạch
                    </Button>
                </div>
                <div className="border-b border-violet-100 bg-violet-50/50 px-5 py-4 sm:px-6">
                    <div className="flex items-start gap-3">
                        <Sparkles className="text-primary mt-0.5 size-5 shrink-0" />
                        <div>
                            <h3 className="font-extrabold text-slate-950">
                                Chiến lược tổng quan
                            </h3>
                            <p className="mt-1 text-sm leading-6 font-medium text-slate-600">
                                {preview.planData.summary}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {preview.planData.openingStrategy}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="divide-y divide-slate-100 p-3 sm:p-4">
                    {preview.planData.sections.map((section, index) => (
                        <PlanPreviewSection
                            key={`${section.title}-${index}`}
                            index={index}
                            title={section.title}
                            objective={section.objective}
                            duration={section.durationMinutes}
                            questions={section.questions}
                        />
                    ))}
                </div>
            </section>

            <aside className="grid gap-4">
                <ReviewSummaryCard icon={FileText} title="Tóm tắt phỏng vấn">
                    <ReviewSummaryRow
                        label="Loại phỏng vấn"
                        value={typeLabel}
                    />
                    <ReviewSummaryRow label="Vai trò mục tiêu" value={role} />
                    <ReviewSummaryRow label="Cấp độ" value={levelLabel} />
                    <ReviewSummaryRow
                        label="Thời lượng"
                        value={`${duration} phút`}
                    />
                    <ReviewSummaryRow
                        label="Tổng số câu hỏi"
                        value={`${totalQuestions} câu`}
                    />
                </ReviewSummaryCard>

                <ReviewSummaryCard icon={FileSearch} title="Ngữ cảnh sử dụng">
                    <ReviewContextRow
                        label="CV"
                        value={cv?.name ?? 'Chưa chọn'}
                    />
                    <ReviewContextRow
                        label="Mô tả công việc"
                        value={job?.title ?? 'Chưa chọn'}
                    />
                </ReviewSummaryCard>

                <ReviewSummaryCard icon={BarChart3} title="Tóm tắt đối chiếu">
                    <div className="flex items-center gap-4 py-1">
                        <div
                            className="grid size-20 shrink-0 place-items-center rounded-full bg-[conic-gradient(#22c55e_var(--score),#dcfce7_0)] p-2"
                            style={
                                {
                                    '--score': `${Math.max(0, Math.min(100, matchScore ?? 0))}%`,
                                } as React.CSSProperties
                            }
                        >
                            <div className="grid size-full place-items-center rounded-full bg-white text-lg font-black text-slate-950">
                                {matchScore == null
                                    ? '—'
                                    : `${Math.round(matchScore)}%`}
                            </div>
                        </div>
                        <p className="text-sm leading-6 font-medium text-slate-600">
                            {preview.planData.summary}
                        </p>
                    </div>
                    {matchId && (
                        <Button
                            asChild
                            variant="outline"
                            className="text-primary mt-3 h-10 w-full rounded-lg border-violet-200 font-bold"
                        >
                            <Link href={`/matching/${matchId}`}>
                                Xem chi tiết đối chiếu
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    )}
                </ReviewSummaryCard>

                <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                    <div className="flex gap-3">
                        <Sparkles className="text-primary mt-0.5 size-5 shrink-0" />
                        <div>
                            <p className="text-primary text-sm font-extrabold">
                                Cá nhân hóa bằng AI
                            </p>
                            <p className="mt-1 text-xs leading-5 font-medium text-slate-600">
                                Kế hoạch được xây dựng từ hồ sơ, yêu cầu công
                                việc và mức độ phù hợp của bạn.
                            </p>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}

function PlanPreviewSection({
    index,
    title,
    objective,
    duration,
    questions,
}: {
    index: number;
    title: string;
    objective: string;
    duration: number;
    questions: InterviewPlanData['sections'][number]['questions'];
}) {
    const icons = [UserRound, Code2, BriefcaseBusiness, BarChart3, CircleHelp];
    const Icon = icons[index % icons.length];
    const tones = [
        'bg-violet-50 text-violet-600',
        'bg-blue-50 text-blue-600',
        'bg-emerald-50 text-emerald-600',
        'bg-amber-50 text-amber-600',
        'bg-rose-50 text-rose-600',
    ];

    return (
        <article className="grid gap-4 rounded-xl px-2 py-4 lg:grid-cols-[minmax(220px,34%)_minmax(0,1fr)] lg:px-3">
            <div className="flex items-start gap-3">
                <span
                    className={`grid size-12 shrink-0 place-items-center rounded-xl ${tones[index % tones.length]}`}
                >
                    <Icon className="size-6" strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-950">
                            {index + 1}. {title}
                        </h3>
                        <span className="text-primary rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold">
                            Khoảng {duration} phút
                        </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 font-medium text-slate-500">
                        {objective}
                    </p>
                </div>
            </div>
            <ol className="space-y-2 rounded-xl border border-violet-100 bg-violet-50/45 p-3">
                {questions.map((question) => (
                    <li
                        key={`${question.order}-${question.suggestedQuestion}`}
                        className="flex gap-3 rounded-lg px-1 py-1 text-sm leading-5 font-medium text-slate-700"
                    >
                        <span className="text-primary grid size-6 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-extrabold">
                            {question.order}
                        </span>
                        <div className="min-w-0">
                            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                    {question.topic}
                                </span>
                                {question.difficulty && (
                                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                        {question.difficulty === 'EASY'
                                            ? 'Cơ bản'
                                            : question.difficulty === 'MEDIUM'
                                              ? 'Trung bình'
                                              : 'Nâng cao'}
                                    </span>
                                )}
                            </div>
                            <p>{question.suggestedQuestion}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </article>
    );
}

function ReviewSummaryCard({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof FileText;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_38px_rgba(54,44,89,.04)]">
            <h2 className="flex items-center gap-2 font-extrabold text-slate-950">
                <span className="text-primary grid size-8 place-items-center rounded-lg bg-violet-50">
                    <Icon className="size-4.5" strokeWidth={2.4} />
                </span>
                {title}
            </h2>
            <div className="mt-3 divide-y divide-slate-100">{children}</div>
        </section>
    );
}

function ReviewSummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 text-sm">
            <span className="font-medium text-slate-500">{label}</span>
            <span className="text-right font-bold text-slate-900">{value}</span>
        </div>
    );
}

function ReviewContextRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-3 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="truncate text-sm font-extrabold text-slate-900">
                    {value}
                </p>
            </div>
        </div>
    );
}

function SectionHeading({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Settings2;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="text-primary grid size-10 shrink-0 place-items-center rounded-lg bg-violet-50">
                <Icon className="size-5" strokeWidth={2.25} />
            </span>
            <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                    {title}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}
function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-1.5 font-bold text-slate-900">
                {label}
                <CircleHelp
                    className="size-4 text-slate-400"
                    aria-label={'Trợ giúp về ' + label.toLocaleLowerCase('vi')}
                />
            </Label>
            {children}
        </div>
    );
}
function InfoBox({ text }: { text: string }) {
    return (
        <p className="flex gap-2 rounded-lg bg-violet-50 px-3 py-2.5 text-xs leading-5 font-semibold text-slate-600">
            <Info className="text-primary mt-0.5 size-4 shrink-0" />
            {text}
        </p>
    );
}
function SourceCard({
    icon: Icon,
    title,
    description,
    href,
    children,
}: {
    icon: typeof FileText;
    title: string;
    description: string;
    href?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <SectionHeading
                    icon={Icon}
                    title={title}
                    description={description}
                />
                {href && (
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-primary shrink-0 rounded-sm px-3 py-2.5 font-bold"
                    >
                        <Link href={href}>
                            Xem đầy đủ
                            <ExternalLink className="size-3.5" />
                        </Link>
                    </Button>
                )}
            </div>
            {children}
        </section>
    );
}
function EmptySourceSelection({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className="hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-primary/25 flex min-h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 text-sm font-bold text-slate-600 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            onClick={onClick}
        >
            <FileSearch className="text-primary size-5" />
            {label}
        </button>
    );
}

function SourcePickerDialog({
    type,
    open,
    onOpenChange,
    items,
    selectedId,
    onSelect,
}: {
    type: 'cv' | 'job';
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: InterviewCvOption[] | InterviewJobOption[];
    selectedId: string;
    onSelect: (id: string) => void;
}) {
    const [search, setSearch] = useState('');
    const normalizedSearch = search.trim().toLocaleLowerCase('vi');
    const filteredItems = items.filter((item) => {
        const text =
            type === 'cv'
                ? `${(item as InterviewCvOption).name} ${(item as InterviewCvOption).originalFilename}`
                : `${(item as InterviewJobOption).title} ${(item as InterviewJobOption).company ?? ''}`;
        return text.toLocaleLowerCase('vi').includes(normalizedSearch);
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                onOpenChange(nextOpen);
                if (!nextOpen) setSearch('');
            }}
        >
            <DialogContent
                className="max-w-2xl p-0"
                mobileContentPosition="start"
            >
                <DialogHeader className="border-b border-slate-100 px-5 pt-16 pr-16 pb-5 sm:px-6 sm:py-5">
                    <DialogTitle>
                        {type === 'cv'
                            ? 'Chọn CV cho buổi phỏng vấn'
                            : 'Chọn mô tả công việc'}
                    </DialogTitle>
                    <DialogDescription>
                        Chỉ hiển thị những nội dung đã được AI phân tích thành
                        công.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-5 sm:p-6">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={
                                type === 'cv'
                                    ? 'Tìm theo tên CV hoặc tên tệp...'
                                    : 'Tìm theo vị trí hoặc công ty...'
                            }
                            className="h-11 rounded-lg pl-10"
                            autoFocus
                        />
                    </div>
                    <div className="mt-4 max-h-[min(440px,55dvh)] space-y-2 overflow-y-auto pr-1">
                        {filteredItems.map((item) => {
                            const cvItem =
                                type === 'cv'
                                    ? (item as InterviewCvOption)
                                    : null;
                            const jobItem =
                                type === 'job'
                                    ? (item as InterviewJobOption)
                                    : null;
                            const active = item.id === selectedId;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={
                                        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ' +
                                        (active
                                            ? 'border-primary/35 bg-primary/5'
                                            : 'border-slate-200 hover:border-violet-200 hover:bg-violet-50/40')
                                    }
                                    onClick={() => {
                                        onSelect(item.id);
                                        onOpenChange(false);
                                        setSearch('');
                                    }}
                                >
                                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-violet-50">
                                        {cvItem ? (
                                            <Image
                                                src="/icons/pdf-file.svg"
                                                alt=""
                                                width={34}
                                                height={34}
                                                className="h-9 w-auto"
                                            />
                                        ) : (
                                            <Image
                                                src="/icons/jd-icon.png"
                                                alt=""
                                                width={36}
                                                height={36}
                                                className="size-9 object-contain"
                                            />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-extrabold text-slate-900">
                                            {cvItem?.name ?? jobItem?.title}
                                        </span>
                                        <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                                            {cvItem
                                                ? `${cvItem.originalFilename} · ${formatFileSize(cvItem.fileSize)}`
                                                : (jobItem?.company ??
                                                  'Chưa cập nhật công ty')}
                                        </span>
                                    </span>
                                    {active && (
                                        <CheckCircle2 className="text-primary size-5 shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                Không tìm thấy kết quả phù hợp.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function DocumentSelection({
    kind,
    title,
    metadata,
    onClear,
}: {
    kind: 'pdf' | 'job';
    title: string;
    metadata: string;
    onClear: () => void;
}) {
    return (
        <div className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <span
                className={
                    kind === 'pdf'
                        ? 'grid size-12 shrink-0 place-items-center rounded-lg bg-red-50 ring-1 ring-red-100'
                        : 'text-primary grid size-12 shrink-0 place-items-center rounded-lg bg-violet-50 ring-1 ring-violet-100'
                }
            >
                {kind === 'pdf' ? (
                    <Image
                        src="/icons/pdf-file.svg"
                        alt="Tài liệu PDF"
                        width={38}
                        height={38}
                        className="h-10 w-auto"
                    />
                ) : (
                    <Image
                        src="/icons/jd-icon.png"
                        alt="Mô tả công việc"
                        width={40}
                        height={40}
                        className="size-10 object-contain"
                    />
                )}
            </span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-slate-900">
                    {title}
                </span>
                <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                    {metadata}
                </span>
            </span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto shrink-0 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label={`Xóa lựa chọn ${title}`}
                onClick={onClear}
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}

function ReadyNotice({
    text,
    onReplace,
}: {
    text: string;
    onReplace: () => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{text}</span>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto h-8 rounded-sm bg-white px-4 text-sm font-bold shadow-sm"
                onClick={onReplace}
            >
                <RefreshCcw className="size-4" />
                Thay đổi
            </Button>
        </div>
    );
}
function AnalysisCard({
    title,
    icon: Icon,
    rows,
}: {
    title: string;
    icon: typeof Code2;
    rows: string[][];
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 font-extrabold text-slate-950">
                <Icon className="text-primary size-5" />
                {title}
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
                    Hoàn tất
                </span>
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {rows.map(([value, label]) => (
                    <div
                        key={label}
                        className="rounded-lg bg-violet-50/60 px-3 py-3"
                    >
                        <p className="text-sm font-extrabold text-slate-900">
                            {value}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
function MatchColumn({
    icon: Icon,
    title,
    items,
    emptyText,
    tone,
}: {
    icon: typeof CheckCircle2;
    title: string;
    items: string[];
    emptyText: string;
    tone: 'success' | 'warning';
}) {
    const visibleItems = items.filter(Boolean).slice(0, 4);
    return (
        <div className="border-t border-slate-100 p-5 sm:p-6 lg:border-t-0 lg:border-l">
            <h3
                className={
                    tone === 'success'
                        ? 'flex items-center gap-2 text-sm font-extrabold text-slate-900'
                        : 'flex items-center gap-2 text-sm font-extrabold text-amber-600'
                }
            >
                <Icon
                    className={
                        tone === 'success'
                            ? 'size-5 shrink-0 text-emerald-500'
                            : 'size-5 shrink-0 fill-amber-400 text-amber-500'
                    }
                    strokeWidth={2.5}
                />
                {title}
            </h3>
            {visibleItems.length > 0 ? (
                <ul className="mt-3 space-y-1.5 pl-1 text-xs leading-5 font-medium text-slate-600">
                    {visibleItems.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex gap-2">
                            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-slate-400" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-3 text-xs leading-5 font-medium text-slate-500">
                    {emptyText}
                </p>
            )}
        </div>
    );
}
function WizardSkeleton() {
    return <div className="mt-7 h-96 animate-pulse rounded-2xl bg-slate-100" />;
}
function LoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="mt-7 rounded-2xl border border-red-100 bg-red-50 p-6">
            <p className="font-bold text-red-700">
                Không thể tải dữ liệu tạo phỏng vấn.
            </p>
            <Button variant="outline" className="mt-3" onClick={onRetry}>
                Thử lại
            </Button>
        </div>
    );
}
