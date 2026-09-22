'use client';

import {
    ArrowLeft,
    CalendarDays,
    CircleAlert,
    Copy,
    Clock3,
    Eye,
    FileCode2,
    FileType2,
    FileText,
    Info,
    RefreshCw,
    Sparkles,
    Star,
    UploadCloud,
    CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { CvActionsMenu } from '@/components/cv/cv-actions-menu';
import {
    CvAnalysisSection,
    type CvAnalysisSectionHandle,
} from '@/components/cv/cv-analysis-section';
import {
    CvVersionsDialog,
    DeleteCvDialog,
    RenameCvDialog,
} from '@/components/cv/cv-dialogs';
import { CvStatusBadge } from '@/components/cv/cv-status-badge';
import { Button } from '@/components/ui/button';
import { useCv, useLatestCvAnalysis, useSetDefaultCv } from '@/hooks/cv';
import { ApiError } from '@/lib/api-error';
import { getCvContentState } from '@/lib/cv-detail-state';
import { formatCvDateTime, formatFileSize } from '@/lib/cv-formatters';
import type {
    CvDetail,
    CvListItem,
    CvStructuredContent,
    CvStructuredLine,
} from '@/types/cv';

export function CvDetailShell({ cvId }: { cvId: string }) {
    const router = useRouter();
    const query = useCv(cvId);
    const defaultMutation = useSetDefaultCv();
    const [renameTarget, setRenameTarget] = useState<CvListItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CvListItem | null>(null);
    const [versionsOpen, setVersionsOpen] = useState(false);

    const setDefault = async (cv: CvListItem) => {
        try {
            await defaultMutation.mutateAsync(cv.id);
            toast.success('Đã cập nhật CV mặc định.');
        } catch (error) {
            toast.error('Không thể đặt CV mặc định', {
                description:
                    error instanceof Error
                        ? error.message
                        : 'Vui lòng thử lại.',
            });
        }
    };

    return (
        <main className="mx-auto w-full max-w-[1600px] min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-3 text-slate-500 hover:text-slate-900"
            >
                <Link
                    href="/cv"
                    className="!text-primary cursor-pointer !font-bold"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Quay lại danh sách CV
                </Link>
            </Button>

            {query.isPending ? (
                <CvDetailSkeleton />
            ) : query.isError ? (
                <CvDetailError
                    error={query.error}
                    onRetry={() => void query.refetch()}
                />
            ) : (
                <>
                    <CvDetailView
                        cv={query.data}
                        actionPending={defaultMutation.isPending}
                        onRename={setRenameTarget}
                        onSetDefault={(cv) => void setDefault(cv)}
                        onDelete={setDeleteTarget}
                        onVersions={() => setVersionsOpen(true)}
                    />
                    <RenameCvDialog
                        cv={renameTarget}
                        open={Boolean(renameTarget)}
                        onOpenChange={(open) => !open && setRenameTarget(null)}
                    />
                    <DeleteCvDialog
                        cv={deleteTarget}
                        open={Boolean(deleteTarget)}
                        onOpenChange={(open) => !open && setDeleteTarget(null)}
                        onDeleted={() => router.replace('/cv')}
                    />
                    <CvVersionsDialog
                        cv={query.data}
                        open={versionsOpen}
                        onOpenChange={setVersionsOpen}
                    />
                </>
            )}
        </main>
    );
}

function CvDetailView({
    cv,
    actionPending,
    onRename,
    onSetDefault,
    onDelete,
    onVersions,
}: {
    cv: CvDetail;
    actionPending: boolean;
    onRename: (cv: CvListItem) => void;
    onSetDefault: (cv: CvListItem) => void;
    onDelete: (cv: CvListItem) => void;
    onVersions: () => void;
}) {
    const latestAnalysisQuery = useLatestCvAnalysis(cv.id);
    const analysisSectionRef = useRef<CvAnalysisSectionHandle>(null);
    const [contentView, setContentView] = useState<'preview' | 'raw'>(
        'preview',
    );

    const copyExtractedText = async () => {
        if (!cv.extractedText) return;

        try {
            await navigator.clipboard.writeText(cv.extractedText);
            toast.success('Đã sao chép nội dung CV.');
        } catch {
            toast.error('Không thể sao chép nội dung CV.');
        }
    };

    return (
        <div className="mt-4 min-w-0 space-y-6">
            <header className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold tracking-[-0.025em] break-words text-slate-950 sm:text-[32px]">
                        {cv.name}
                    </h1>
                    <p className="mt-1 text-sm font-bold [overflow-wrap:anywhere] text-slate-500">
                        {cv.originalFilename}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CvStatusBadge status={cv.processingStatus} />
                        {cv.isDefault && (
                            <span className="inline-flex items-center gap-1.5 rounded-sm bg-violet-100 px-2.5 py-2 text-xs font-bold text-violet-700">
                                <Star
                                    className="size-3.5"
                                    aria-hidden="true"
                                    strokeWidth={3}
                                />
                                Mặc định
                            </span>
                        )}
                    </div>
                    <time
                        dateTime={cv.updatedAt}
                        className="mt-2 block text-[13px] font-bold text-slate-400"
                    >
                        Cập nhật lần cuối {formatCvDateTime(cv.updatedAt)}
                    </time>
                </div>
                <div className="flex items-center justify-end gap-2 self-stretch lg:self-auto">
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-sm !p-4 font-semibold"
                        onClick={onVersions}
                    >
                        <UploadCloud
                            className="size-4"
                            aria-hidden="true"
                            strokeWidth={2.5}
                        />
                        Cập nhật file
                    </Button>
                    <Button
                        type="button"
                        className="min-w-0 shrink-0 rounded-sm !p-4"
                        disabled={
                            cv.processingStatus !== 'READY' ||
                            !cv.extractedText?.trim() ||
                            latestAnalysisQuery.isPending
                        }
                        onClick={() =>
                            analysisSectionRef.current?.requestAnalysis()
                        }
                    >
                        <Sparkles className="size-4" aria-hidden="true" />
                        {latestAnalysisQuery.data
                            ? 'Phân tích lại'
                            : 'Phân tích CV'}
                    </Button>
                    <CvActionsMenu
                        cv={cv}
                        actionPending={actionPending}
                        showView={false}
                        onRename={onRename}
                        onSetDefault={onSetDefault}
                        onDelete={onDelete}
                    />
                </div>
            </header>

            <section
                className="rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(30,41,59,0.045)] sm:p-5"
                aria-labelledby="cv-information-heading"
            >
                <div className="mb-4 flex items-center gap-2.5">
                    <FileText
                        className="text-primary size-5"
                        aria-hidden="true"
                    />
                    <h2
                        id="cv-information-heading"
                        className="font-extrabold text-slate-950"
                    >
                        Thông tin CV
                    </h2>
                </div>
                <dl className="grid overflow-hidden rounded-md border !border-slate-100 py-4 md:grid-cols-2 xl:grid-cols-[1.35fr_1.75fr_1.15fr_1.15fr]">
                    <FileSummary cv={cv} />
                    <CvTimelineMetadata
                        uploadedAt={cv.createdAt}
                        analyzedAt={
                            latestAnalysisQuery.data?.completedAt ??
                            latestAnalysisQuery.data?.createdAt ??
                            null
                        }
                    />
                    <Metadata
                        icon={getProcessingIcon(cv.processingStatus)}
                        iconClassName="size-5"
                        iconStrokeWidth={2.5}
                        label="Trạng thái"
                        value={getProcessingLabel(cv.processingStatus)}
                        tone={getProcessingTone(cv.processingStatus)}
                        description={
                            cv.processingStatus === 'READY'
                                ? 'CV đã sẵn sàng để phân tích.'
                                : undefined
                        }
                    />
                    <Metadata
                        icon={Star}
                        iconClassName="size-[18px]"
                        iconStrokeWidth={2.5}
                        label="CV mặc định"
                        value={cv.isDefault ? 'Có' : 'Không'}
                        tone={cv.isDefault ? 'violet' : 'default'}
                        description={
                            cv.isDefault
                                ? 'Được ưu tiên dùng cho phỏng vấn.'
                                : undefined
                        }
                    />
                </dl>
            </section>

            <CvAnalysisSection ref={analysisSectionRef} cv={cv} />

            <section
                className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_10px_35px_rgba(76,57,126,0.07)] ring-1 ring-slate-100"
                aria-labelledby="parsed-content-heading"
            >
                <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                            <FileType2
                                className="size-4.5"
                                aria-hidden="true"
                            />
                        </span>
                        <div>
                            <h2
                                id="parsed-content-heading"
                                className="font-extrabold text-slate-950"
                            >
                                Nội dung CV đã trích xuất
                            </h2>
                            <p className="mt-0.5 text-sm font-semibold text-slate-500">
                                Văn bản được đọc trực tiếp từ tệp PDF.
                            </p>
                        </div>
                    </div>
                    {getCvContentState(cv) === 'READY' && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-primary !border-primary/50 hover:text-primray/90 w-full rounded-sm !p-5 font-bold sm:w-auto"
                            onClick={() => void copyExtractedText()}
                        >
                            <Copy className="size-4" aria-hidden="true" />
                            Sao chép nội dung
                        </Button>
                    )}
                </div>
                {getCvContentState(cv) === 'READY' && (
                    <div
                        className="relative mx-5 grid w-fit grid-cols-2 rounded-lg bg-slate-100/90 p-1 ring-1 ring-slate-200/70 sm:mx-6"
                        role="tablist"
                        aria-label="Chế độ hiển thị nội dung CV"
                    >
                        <span
                            aria-hidden="true"
                            className={
                                'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-white shadow-sm ring-1 ring-slate-200/70 transition-transform duration-300 ease-out ' +
                                (contentView === 'raw'
                                    ? 'translate-x-full'
                                    : 'translate-x-0')
                            }
                        />
                        <button
                            type="button"
                            role="tab"
                            aria-selected={contentView === 'preview'}
                            className={
                                'relative z-10 inline-flex min-w-32 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:outline-none ' +
                                (contentView === 'preview'
                                    ? 'text-primary'
                                    : 'text-slate-500 hover:text-slate-800')
                            }
                            onClick={() => setContentView('preview')}
                        >
                            <Eye
                                className="hidden size-4 sm:block"
                                aria-hidden="true"
                            />
                            Bản xem trước
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={contentView === 'raw'}
                            className={
                                'relative z-10 inline-flex min-w-32 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:outline-none ' +
                                (contentView === 'raw'
                                    ? 'text-primary'
                                    : 'text-slate-500 hover:text-slate-800')
                            }
                            onClick={() => setContentView('raw')}
                        >
                            <FileCode2
                                className="hidden size-4 sm:block"
                                aria-hidden="true"
                            />
                            Văn bản thô
                        </button>
                    </div>
                )}
                <ParsedCvContent cv={cv} view={contentView} />
            </section>
        </div>
    );
}

const cvInfoColumnClassName =
    'relative flex min-w-0 items-center p-4 before:absolute before:top-0 before:right-4 before:left-4 before:h-px before:bg-slate-200/80 md:p-5 md:[&:nth-child(2)]:before:hidden xl:before:top-4 xl:before:right-auto xl:before:bottom-4 xl:before:left-0 xl:before:h-auto xl:before:w-px xl:[&:nth-child(2)]:before:block';

function FileSummary({ cv }: { cv: CvDetail }) {
    return (
        <div className="flex min-w-0 items-center gap-4 p-4 md:p-5">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
                <Image
                    src="/icons/pdf-file.svg"
                    alt="Tài liệu PDF"
                    width={50}
                    height={50}
                    className="h-20 w-auto"
                />
            </span>
            <div className="min-w-0">
                <dt
                    className="truncate font-bold text-slate-900"
                    title={cv.originalFilename}
                >
                    {cv.originalFilename}
                </dt>
                <dd className="mt-1.5 space-y-1 text-xs font-medium text-slate-500">
                    <span className="block font-bold">
                        {formatFileSize(cv.fileSize)}
                    </span>
                    <span className="block">Tài liệu PDF</span>
                </dd>
            </div>
        </div>
    );
}

function CvTimelineMetadata({
    uploadedAt,
    analyzedAt,
}: {
    uploadedAt: string;
    analyzedAt: string | null;
}) {
    return (
        <div className={cvInfoColumnClassName}>
            <div className="grid min-w-0 flex-1 gap-6 sm:grid-cols-2">
                <TimelineValue
                    label="Ngày tải lên"
                    labelIcon={UploadCloud}
                    valueIcon={CalendarDays}
                    value={formatCvDateTime(uploadedAt)}
                    dateTime={uploadedAt}
                />
                <TimelineValue
                    label="Phân tích gần nhất"
                    valueIcon={Clock3}
                    value={
                        analyzedAt
                            ? formatCvDateTime(analyzedAt)
                            : 'Chưa phân tích'
                    }
                    dateTime={analyzedAt ?? undefined}
                />
            </div>
        </div>
    );
}

function TimelineValue({
    label,
    labelIcon: LabelIcon,
    valueIcon: ValueIcon,
    value,
    dateTime,
}: {
    label: string;
    labelIcon?: typeof CalendarDays;
    valueIcon: typeof CalendarDays;
    value: string;
    dateTime?: string;
}) {
    return (
        <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[13px] font-bold text-slate-500">
                {LabelIcon && (
                    <LabelIcon
                        className="size-4 stroke-3 text-slate-400"
                        aria-hidden="true"
                    />
                )}
                {label}
            </dt>
            <dd className="mt-2 flex min-w-0 items-center gap-2 text-[13px] font-bold text-slate-700">
                <ValueIcon
                    className="text-primary size-4 shrink-0"
                    aria-hidden="true"
                />
                <span className="ml-1">
                    {dateTime ? (
                        <time className="break-words" dateTime={dateTime}>
                            {value}
                        </time>
                    ) : (
                        <span>{value}</span>
                    )}
                </span>
            </dd>
        </div>
    );
}

function Metadata({
    icon: Icon,
    iconClassName,
    iconStrokeWidth,
    label,
    value,
    dateTime,
    description,
    tone = 'default',
}: {
    icon: typeof Star;
    iconClassName?: string;
    iconStrokeWidth?: number;
    label: string;
    value: string;
    dateTime?: string;
    description?: string;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'violet';
}) {
    return (
        <div className={cvInfoColumnClassName}>
            <MetadataValue
                icon={Icon}
                iconClassName={iconClassName}
                iconStrokeWidth={iconStrokeWidth}
                label={label}
                value={value}
                dateTime={dateTime}
                description={description}
                tone={tone}
            />
        </div>
    );
}

function MetadataValue({
    icon: Icon,
    iconClassName = 'size-4',
    iconStrokeWidth = 2,
    label,
    value,
    dateTime,
    description,
    tone = 'default',
}: {
    icon: typeof Star;
    iconClassName?: string;
    iconStrokeWidth?: number;
    label: string;
    value: string;
    dateTime?: string;
    description?: string;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'violet';
}) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <span
                className={
                    'flex size-8 shrink-0 items-center justify-center ' +
                    (tone === 'success'
                        ? 'text-emerald-600'
                        : tone === 'warning'
                          ? 'text-amber-600'
                          : tone === 'danger'
                            ? 'text-red-600'
                            : 'text-primary')
                }
            >
                <Icon
                    className={iconClassName}
                    aria-hidden="true"
                    strokeWidth={iconStrokeWidth}
                />
            </span>
            <div className="min-w-0">
                <dt className="text-[13px] font-bold text-slate-400">
                    {label}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold break-words text-slate-800">
                    {dateTime ? (
                        <time dateTime={dateTime}>{value}</time>
                    ) : tone !== 'default' ? (
                        <span
                            className={
                                'inline-flex rounded-sm px-2.5 py-1 text-xs font-bold ' +
                                (tone === 'success'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : tone === 'warning'
                                      ? 'bg-amber-100 text-amber-700'
                                      : tone === 'danger'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-violet-100 text-violet-700')
                            }
                        >
                            {value}
                        </span>
                    ) : (
                        value
                    )}
                </dd>
                {description && (
                    <p className="mt-1.5 text-xs leading-4 font-medium text-slate-400">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

function getProcessingLabel(status: CvDetail['processingStatus']) {
    return {
        UPLOADING: 'Đang tải lên',
        PROCESSING: 'Đang xử lý',
        READY: 'Sẵn sàng',
        FAILED: 'Xử lý thất bại',
    }[status];
}

function getProcessingIcon(status: CvDetail['processingStatus']) {
    if (status === 'FAILED') return CircleAlert;
    if (status === 'READY') return CheckCircle2;
    return Clock3;
}

function getProcessingTone(
    status: CvDetail['processingStatus'],
): 'success' | 'warning' | 'danger' {
    if (status === 'READY') return 'success';
    if (status === 'FAILED') return 'danger';
    return 'warning';
}

function ParsedCvContent({
    cv,
    view,
}: {
    cv: CvDetail;
    view: 'preview' | 'raw';
}) {
    const state = getCvContentState(cv);

    if (state === 'READY') {
        return (
            <article className="min-w-0 bg-slate-50/35 p-4 sm:p-6">
                {view === 'preview' ? (
                    <CvDocumentPreview
                        text={cv.extractedText ?? ''}
                        structuredContent={cv.structuredContent}
                    />
                ) : (
                    <pre className="rounded-xl bg-slate-950 px-5 py-6 font-mono text-xs leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-200">
                        {cv.extractedText}
                    </pre>
                )}
            </article>
        );
    }

    if (state === 'UPLOADING') {
        return (
            <ContentMessage
                icon={Clock3}
                title="CV đang được tải lên"
                description="Vui lòng chờ tệp được lưu an toàn trước khi hệ thống xử lý nội dung."
                tone="sky"
                busy
            />
        );
    }

    if (state === 'PROCESSING') {
        return (
            <ContentMessage
                icon={RefreshCw}
                title="CV đang được xử lý"
                description="Interviewly đang trích xuất nội dung chữ từ PDF. Bạn có thể quay lại kiểm tra sau."
                tone="amber"
                busy
            />
        );
    }

    if (state === 'FAILED') {
        return (
            <ContentMessage
                icon={CircleAlert}
                title="Không thể xử lý CV này"
                description="Hãy kiểm tra PDF có nội dung chữ có thể chọn, hoặc tải lên một CV khác."
                tone="red"
            />
        );
    }

    return (
        <ContentMessage
            icon={Info}
            title="Chưa có nội dung để hiển thị"
            description="CV đã sẵn sàng nhưng nội dung trích xuất hiện không khả dụng."
            tone="violet"
        />
    );
}

type PreviewLine =
    | {
          kind: 'paragraph' | 'bullet' | 'subheading';
          value: string;
      }
    | {
          kind: 'titleRow';
          value: string;
          meta: string;
      };

type PreviewSection = {
    title: string | null;
    lines: PreviewLine[];
};

function CvDocumentPreview({
    text,
    structuredContent,
}: {
    text: string;
    structuredContent?: CvStructuredContent | null;
}) {
    if (structuredContent) {
        return <StructuredCvPreview content={structuredContent} />;
    }

    const document = buildCvDocument(text);

    return (
        <div className="rounded-xl bg-slate-200/55 p-3 sm:p-6">
            <div className="mx-auto min-h-[680px] max-w-4xl bg-white px-6 py-8 shadow-[0_18px_50px_rgba(30,41,59,0.12)] sm:px-10 sm:py-10 lg:px-14">
                <header className="border-b-2 border-violet-600 pb-7 text-center">
                    <h3 className="text-2xl font-black tracking-tight [overflow-wrap:anywhere] text-slate-950 sm:text-3xl">
                        {document.name}
                    </h3>
                    {document.subtitle && (
                        <p className="mt-1 text-base font-bold text-violet-700">
                            {document.subtitle}
                        </p>
                    )}
                    {document.contacts.length > 0 && (
                        <div className="mt-5 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs font-semibold text-slate-500">
                            {document.contacts.map((contact, index) => (
                                <span
                                    key={`${contact}-${index}`}
                                    className="min-w-0 [overflow-wrap:anywhere]"
                                >
                                    {contact}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                <div className="mt-7 space-y-7">
                    {document.sections.map((section, sectionIndex) => (
                        <section
                            key={`${section.title}-${sectionIndex}`}
                            aria-label={section.title ?? undefined}
                        >
                            {section.title && (
                                <div className="mb-3 flex items-center gap-3">
                                    <h4 className="shrink-0 text-xs font-black tracking-[0.12em] text-violet-700 uppercase">
                                        {section.title}
                                    </h4>
                                    <span className="h-px flex-1 bg-violet-100" />
                                </div>
                            )}
                            <div className="space-y-2">
                                {section.lines.map((line, lineIndex) =>
                                    line.kind === 'titleRow' ? (
                                        <div
                                            key={`${line.value}-${lineIndex}`}
                                            className="flex flex-col gap-1 pt-2 first:pt-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
                                        >
                                            <p className="text-sm leading-6 font-extrabold [overflow-wrap:anywhere] text-slate-900">
                                                {line.value}
                                            </p>
                                            <span className="shrink-0 text-xs font-bold text-slate-500 sm:text-right">
                                                {line.meta}
                                            </span>
                                        </div>
                                    ) : line.kind === 'bullet' ? (
                                        <div
                                            key={`${line.value}-${lineIndex}`}
                                            className="flex gap-2.5 text-sm leading-6 text-slate-700"
                                        >
                                            <span
                                                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-violet-500"
                                                aria-hidden="true"
                                            />
                                            <p className="[overflow-wrap:anywhere]">
                                                {line.value}
                                            </p>
                                        </div>
                                    ) : line.kind === 'subheading' ? (
                                        <p
                                            key={`${line.value}-${lineIndex}`}
                                            className="pt-1 text-sm leading-6 font-extrabold [overflow-wrap:anywhere] text-slate-900 first:pt-0"
                                        >
                                            {line.value}
                                        </p>
                                    ) : (
                                        <p
                                            key={`${line.value}-${lineIndex}`}
                                            className="text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-700"
                                        >
                                            {line.value}
                                        </p>
                                    ),
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StructuredCvPreview({ content }: { content: CvStructuredContent }) {
    return (
        <div className="rounded-xl bg-slate-200/55 p-3 sm:p-6">
            <div className="mx-auto min-h-[680px] max-w-4xl bg-white px-6 py-8 shadow-[0_18px_50px_rgba(30,41,59,0.12)] sm:px-10 sm:py-10 lg:px-14">
                <header className="border-b-2 border-violet-600 pb-7 text-center">
                    {content.header.name && (
                        <h3 className="text-2xl font-black tracking-tight [overflow-wrap:anywhere] text-slate-950 sm:text-3xl">
                            {content.header.name}
                        </h3>
                    )}
                    {content.header.headline && (
                        <p className="mt-1 text-base font-bold text-violet-700">
                            {content.header.headline}
                        </p>
                    )}
                    {content.header.contacts.length > 0 && (
                        <div className="mt-5 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs font-semibold text-slate-500">
                            {content.header.contacts.map((contact, index) => (
                                <span
                                    key={`${contact}-${index}`}
                                    className="min-w-0 [overflow-wrap:anywhere]"
                                >
                                    {contact}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                <div className="mt-7 space-y-7">
                    {content.sections.map((section, sectionIndex) => (
                        <section
                            key={`${section.title}-${sectionIndex}`}
                            aria-label={section.title}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <h4 className="shrink-0 text-xs font-black tracking-[0.12em] text-violet-700 uppercase">
                                    {section.title}
                                </h4>
                                <span className="h-px flex-1 bg-violet-100" />
                            </div>
                            <div className="space-y-5">
                                {section.items.map((item, itemIndex) => (
                                    <article
                                        key={`${item.title ?? item.subtitle ?? itemIndex}-${itemIndex}`}
                                    >
                                        {(item.title ||
                                            item.subtitle ||
                                            item.dateText) && (
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
                                                <div className="min-w-0">
                                                    {item.title && (
                                                        <h5 className="text-sm leading-6 font-extrabold [overflow-wrap:anywhere] text-slate-900">
                                                            {item.title}
                                                        </h5>
                                                    )}
                                                    {item.subtitle && (
                                                        <p className="text-sm leading-6 font-semibold [overflow-wrap:anywhere] text-slate-600">
                                                            {item.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                                {item.dateText && (
                                                    <span className="shrink-0 text-xs font-bold text-slate-500 sm:text-right">
                                                        {item.dateText}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {item.lines.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                                {item.lines.map(
                                                    (line, lineIndex) => (
                                                        <StructuredCvLine
                                                            key={`${line.type}-${lineIndex}`}
                                                            line={line}
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StructuredCvLine({ line }: { line: CvStructuredLine }) {
    if (line.type === 'BULLET') {
        return (
            <div className="flex gap-2.5 text-sm leading-6 text-slate-700">
                <span
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-violet-500"
                    aria-hidden="true"
                />
                <p className="[overflow-wrap:anywhere]">{line.content}</p>
            </div>
        );
    }

    if (line.type === 'TECHNOLOGIES') {
        return (
            <p className="text-sm leading-6 font-semibold [overflow-wrap:anywhere] text-slate-700">
                {line.content}
            </p>
        );
    }

    if (line.type === 'LINKS') {
        return (
            <p className="text-sm leading-6 [overflow-wrap:anywhere] text-violet-700">
                {line.content}
            </p>
        );
    }

    return (
        <p className="text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-700">
            {line.content}
        </p>
    );
}

function buildCvDocument(text: string): {
    name: string;
    subtitle: string | null;
    contacts: string[];
    sections: PreviewSection[];
} {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return {
            name: 'CV',
            subtitle: null,
            contacts: [],
            sections: [],
        };
    }

    const name = lines[0];
    const firstHeadingIndex = lines.findIndex(
        (line, index) => index > 0 && isCvSectionHeading(line),
    );
    const headerEnd =
        firstHeadingIndex === -1
            ? Math.min(lines.length, 8)
            : firstHeadingIndex;
    const headerCandidates = lines.slice(1, headerEnd);
    const contacts = headerCandidates
        .filter(isContactLine)
        .flatMap(splitContactItems);
    const subtitle =
        headerCandidates.find((line) => !isContactLine(line)) ?? null;
    const introduction = headerCandidates.filter(
        (line) => line !== subtitle && !isContactLine(line),
    );
    const bodyLines =
        firstHeadingIndex === -1
            ? lines.slice(headerEnd)
            : lines.slice(headerEnd);
    const sections: PreviewSection[] = [];
    let current: PreviewSection | null = null;

    if (introduction.length > 0) {
        sections.push({
            title: null,
            lines: introduction.map((value) => ({
                kind: 'paragraph',
                value,
            })),
        });
    }

    for (const line of bodyLines) {
        if (isCvSectionHeading(line)) {
            current = {
                title: line.replace(/:$/, ''),
                lines: [],
            };
            sections.push(current);
            continue;
        }

        if (!current) {
            current = { title: null, lines: [] };
            sections.push(current);
        }

        const bullet = line.match(/^(?:[-•▪◦*]|\d+[.)])\s*(.+)$/);
        const titleRow = parseTitleRow(line, current.title);

        if (titleRow) {
            current.lines.push({
                kind: 'titleRow',
                value: titleRow.title,
                meta: titleRow.meta,
            });
            continue;
        }

        if (isDateRange(line) && current.lines.at(-1)?.kind === 'subheading') {
            const previous = current.lines.pop();
            if (previous?.kind === 'subheading') {
                current.lines.push({
                    kind: 'titleRow',
                    value: previous.value,
                    meta: line,
                });
            }
            continue;
        }

        current.lines.push({
            kind: bullet
                ? 'bullet'
                : isSecondaryHeading(line, current.title)
                  ? 'subheading'
                  : 'paragraph',
            value: bullet?.[1] ?? line,
        });
    }

    return {
        name,
        subtitle,
        contacts,
        sections: sections.filter((section) => section.lines.length > 0),
    };
}

const CV_SECTION_HEADINGS = new Set([
    'SUMMARY',
    'ABOUT',
    'ABOUT ME',
    'PROFILE',
    'PROFESSIONAL SUMMARY',
    'CAREER OBJECTIVE',
    'OBJECTIVE',
    'EXPERIENCE',
    'WORK EXPERIENCE',
    'EMPLOYMENT HISTORY',
    'EDUCATION',
    'SKILLS',
    'TECHNICAL SKILLS',
    'PROJECTS',
    'CERTIFICATIONS',
    'AWARDS',
    'ACTIVITIES',
    'LANGUAGES',
    'REFERENCES',
    'GIỚI THIỆU',
    'MỤC TIÊU NGHỀ NGHIỆP',
    'KINH NGHIỆM',
    'KINH NGHIỆM LÀM VIỆC',
    'HỌC VẤN',
    'KỸ NĂNG',
    'DỰ ÁN',
    'CHỨNG CHỈ',
    'GIẢI THƯỞNG',
    'HOẠT ĐỘNG',
    'NGÔN NGỮ',
]);

function isCvSectionHeading(line: string): boolean {
    return CV_SECTION_HEADINGS.has(line.replace(/:$/, '').trim().toUpperCase());
}

function isContactLine(line: string): boolean {
    return (
        /@|https?:\/\/|www\.|linkedin|github/i.test(line) ||
        /(?:\+?\d[\d\s().-]{7,})/.test(line) ||
        /(?:Hà Nội|Hanoi|TP\.?\s*HCM|Ho Chi Minh|Đà Nẵng|Da Nang|Vietnam)/i.test(
            line,
        )
    );
}

function splitContactItems(line: string): string[] {
    return line
        .split(/\s*[|•]\s*/)
        .map((item) => item.trim())
        .filter(Boolean);
}

const SECONDARY_HEADING_SECTIONS = new Set([
    'EXPERIENCE',
    'WORK EXPERIENCE',
    'EMPLOYMENT HISTORY',
    'EDUCATION',
    'PROJECTS',
    'KINH NGHIỆM',
    'KINH NGHIỆM LÀM VIỆC',
    'HỌC VẤN',
    'DỰ ÁN',
]);

function isSecondaryHeading(
    line: string,
    sectionTitle: string | null,
): boolean {
    if (
        !sectionTitle ||
        !SECONDARY_HEADING_SECTIONS.has(sectionTitle.trim().toUpperCase())
    ) {
        return false;
    }

    const value = line.trim();
    return (
        value.length >= 2 &&
        value.length <= 90 &&
        !/[.!?;:]$/.test(value) &&
        !value.includes(',') &&
        !value.includes('•') &&
        !/^(?:live demo|demo|api docs|github|frontend github|backend github)\b/i.test(
            value,
        ) &&
        !isContactLine(value) &&
        !isDateRange(value)
    );
}

const MONTH_PATTERN =
    '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Tháng\\s+\\d{1,2})';
const DATE_POINT_PATTERN = `(?:${MONTH_PATTERN}\\s+)?(?:19|20)\\d{2}`;
const DATE_END_PATTERN = `(?:${DATE_POINT_PATTERN}|Present|Current|Now|Hiện tại|Nay)`;
const DATE_RANGE_PATTERN = new RegExp(
    `(${DATE_POINT_PATTERN}\\s*(?:-|–|—|to|đến)\\s*${DATE_END_PATTERN})$`,
    'i',
);

function parseTitleRow(
    line: string,
    sectionTitle: string | null,
): { title: string; meta: string } | null {
    if (
        !sectionTitle ||
        !SECONDARY_HEADING_SECTIONS.has(sectionTitle.trim().toUpperCase())
    ) {
        return null;
    }

    const match = line.match(DATE_RANGE_PATTERN);
    if (!match || match.index === undefined) return null;

    const title = line.slice(0, match.index).trim();
    if (!title) return null;

    return {
        title,
        meta: match[1].trim(),
    };
}

function isDateRange(value: string): boolean {
    return DATE_RANGE_PATTERN.test(value.trim());
}

function ContentMessage({
    icon: Icon,
    title,
    description,
    tone,
    busy = false,
}: {
    icon: typeof Info;
    title: string;
    description: string;
    tone: 'sky' | 'amber' | 'red' | 'violet';
    busy?: boolean;
}) {
    const toneClass = {
        sky: 'bg-sky-50 text-sky-700',
        amber: 'bg-amber-50 text-amber-700',
        red: 'bg-red-50 text-red-700',
        violet: 'bg-violet-50 text-violet-700',
    }[tone];

    return (
        <div
            className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center"
            aria-live={busy ? 'polite' : undefined}
            aria-busy={busy || undefined}
        >
            <span
                className={
                    'flex size-14 items-center justify-center rounded-2xl ' +
                    toneClass
                }
            >
                <Icon
                    className={'size-6 ' + (busy ? 'animate-pulse' : '')}
                    aria-hidden="true"
                />
            </span>
            <h3 className="mt-4 text-lg font-extrabold text-slate-950">
                {title}
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-6 font-medium text-slate-500">
                {description}
            </p>
        </div>
    );
}

function CvDetailSkeleton() {
    return (
        <div
            className="mt-4 space-y-5"
            aria-label="Đang tải thông tin CV"
            aria-busy="true"
        >
            <div className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-white" />
            <div className="h-96 animate-pulse rounded-2xl border border-slate-100 bg-white" />
        </div>
    );
}

function CvDetailError({
    error,
    onRetry,
}: {
    error: Error;
    onRetry: () => void;
}) {
    const notFound =
        error instanceof ApiError &&
        (error.statusCode === 404 || error.code === 'CV_NOT_FOUND');

    return (
        <section className="mt-4 flex min-h-96 flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-5 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <CircleAlert className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold text-slate-950">
                {notFound ? 'Không tìm thấy CV' : 'Không thể tải thông tin CV'}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 font-medium text-slate-500">
                {notFound
                    ? 'CV không tồn tại hoặc bạn không có quyền truy cập tài liệu này.'
                    : 'Đã có lỗi khi kết nối tới máy chủ. Vui lòng thử lại.'}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline">
                    <Link href="/cv">Về danh sách CV</Link>
                </Button>
                {!notFound && (
                    <Button onClick={onRetry}>
                        <RefreshCw className="size-4" aria-hidden="true" />
                        Thử lại
                    </Button>
                )}
            </div>
        </section>
    );
}
