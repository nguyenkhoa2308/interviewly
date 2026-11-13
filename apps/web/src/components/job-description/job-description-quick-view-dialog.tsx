'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    Check,
    CheckCircle2,
    Code2,
    ExternalLink,
    Eye,
    FileText,
    ListChecks,
    MapPin,
    Pencil,
    Timer,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLatestJdAnalysis } from '@/hooks/job-description';
import { cn } from '@/lib/utils';
import type { JobDescriptionListItem } from '@/types/job-description';

type QuickViewTab = 'overview' | 'requirements' | 'skills' | 'analysis';

const TABS: Array<{ value: QuickViewTab; label: string }> = [
    { value: 'overview', label: 'Tổng quan' },
    { value: 'requirements', label: 'Yêu cầu' },
    { value: 'skills', label: 'Kỹ năng' },
    { value: 'analysis', label: 'Phân tích AI' },
];

interface JobDescriptionQuickViewDialogProps {
    item: JobDescriptionListItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JobDescriptionQuickViewDialog({
    item,
    open,
    onOpenChange,
}: JobDescriptionQuickViewDialogProps) {
    const [activeTab, setActiveTab] = useState<QuickViewTab>('overview');
    const latestAnalysisQuery = useLatestJdAnalysis(
        open && item ? item.id : '',
    );
    const listAnalysis = item?.analyses[0];
    const analysis = latestAnalysisQuery.data ?? listAnalysis;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) setActiveTab('overview');
        onOpenChange(nextOpen);
    };

    const skills = useMemo(
        () =>
            Array.from(
                new Set([
                    ...(analysis?.requiredSkills ?? []),
                    ...(analysis?.preferredSkills ?? []),
                ]),
            ),
        [analysis],
    );

    if (!item) return null;

    const fullAnalysis = latestAnalysisQuery.data;
    const requirements = fullAnalysis?.requirements ?? [];
    const responsibilities = fullAnalysis?.responsibilities ?? [];
    const interviewFocus = fullAnalysis?.interviewFocus ?? [];
    const summary = analysis?.summary || excerpt(item.content, 430);
    const hasDetailedAnalysis = Boolean(fullAnalysis);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                aria-describedby={undefined}
                className="data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right !top-0 !right-0 !bottom-0 !left-auto flex !h-dvh !max-h-none !w-full !max-w-[660px] !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden !rounded-none border-y-0 border-r-0 border-l-violet-200 bg-[#fcfbff] p-0 shadow-[-20px_0_70px_rgba(67,45,135,0.18)] max-sm:!max-w-none"
            >
                <header className="flex shrink-0 items-center gap-3 border-b border-violet-100 bg-white px-6 py-5 pr-16 sm:px-7">
                    <Eye className="text-primary size-6" strokeWidth={2.7} />
                    <DialogTitle className="text-lg font-black tracking-tight text-[#211052] sm:text-xl">
                        Xem nhanh mô tả công việc
                    </DialogTitle>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
                    <section className="flex items-start gap-4">
                        <div className="text-primary flex size-14 shrink-0 items-center justify-center rounded-xl bg-violet-100 shadow-[0_8px_20px_rgba(109,60,220,0.12)] ring-1 ring-violet-200">
                            <Building2 className="size-7" strokeWidth={2.65} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="truncate text-xl font-black tracking-tight text-[#1f123f] sm:text-2xl">
                                        {item.title}
                                    </h2>
                                    <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-600">
                                        <Building2 className="text-primary size-4" />
                                        {item.company || 'Chưa có tên công ty'}
                                    </p>
                                </div>
                                <AnalysisStatus status={analysis?.status} />
                            </div>
                        </div>
                    </section>

                    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold text-slate-500">
                        <span className="flex items-center gap-2">
                            <CalendarDays className="size-4 text-slate-400" />
                            Cập nhật: {formatDate(item.updatedAt)}
                        </span>
                        <span className="hidden h-5 w-px bg-slate-200 sm:block" />
                        <span className="flex items-center gap-2">
                            <FileText className="size-4 text-slate-400" />
                            Độ dài:{' '}
                            {countWords(item.content).toLocaleString(
                                'vi-VN',
                            )}{' '}
                            từ
                        </span>
                    </div>

                    <div
                        className="mt-6 grid grid-cols-4 rounded-xl bg-violet-50 p-1.5 ring-1 ring-violet-100"
                        role="tablist"
                    >
                        {TABS.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.value}
                                className={cn(
                                    'min-h-10 cursor-pointer rounded-lg px-2 text-xs font-extrabold transition-[color,background-color,box-shadow] sm:text-sm',
                                    activeTab === tab.value
                                        ? 'text-primary bg-white shadow-[0_4px_14px_rgba(109,60,220,0.15)] ring-1 ring-violet-200'
                                        : 'hover:text-primary text-slate-600 hover:bg-white/60',
                                )}
                                onClick={() => setActiveTab(tab.value)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {latestAnalysisQuery.isLoading ? (
                        <QuickViewSkeleton />
                    ) : (
                        <div className="mt-5">
                            {latestAnalysisQuery.isError && (
                                <div
                                    role="status"
                                    className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 font-medium text-amber-800"
                                >
                                    Chưa thể tải đầy đủ kết quả phân tích. Một
                                    số thông tin bên dưới có thể chưa hiển thị.
                                </div>
                            )}
                            {activeTab === 'overview' && (
                                <OverviewTab
                                    summary={summary}
                                    seniority={analysis?.seniority}
                                    content={item.content}
                                    skills={skills}
                                    requirements={requirements}
                                    hasDetailedAnalysis={hasDetailedAnalysis}
                                />
                            )}
                            {activeTab === 'requirements' && (
                                <RequirementsTab
                                    requirements={requirements}
                                    responsibilities={responsibilities}
                                    hasDetailedAnalysis={hasDetailedAnalysis}
                                />
                            )}
                            {activeTab === 'skills' && (
                                <SkillsTab skills={skills} />
                            )}
                            {activeTab === 'analysis' && (
                                <AnalysisTab
                                    summary={analysis?.summary}
                                    detectedRole={analysis?.detectedRole}
                                    seniority={analysis?.seniority}
                                    interviewFocus={interviewFocus}
                                    hasAnalysis={
                                        analysis?.status === 'COMPLETED'
                                    }
                                />
                            )}
                        </div>
                    )}
                </div>

                <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-violet-100 bg-white px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-7">
                    <Button
                        asChild
                        variant="outline"
                        className="text-primary h-12 min-w-0 rounded-lg border-violet-300 px-3 font-extrabold shadow-[0_5px_16px_rgba(109,60,220,0.08)] hover:bg-violet-50 sm:px-5"
                    >
                        <Link href={`/job-descriptions/${item.id}`}>
                            Xem chi tiết
                            <ExternalLink className="size-4" />
                        </Link>
                    </Button>
                    <Button
                        asChild
                        className="h-12 min-w-0 rounded-lg px-3 font-extrabold shadow-[0_10px_24px_rgba(109,60,220,0.28)] sm:px-6"
                    >
                        <Link href={`/job-descriptions/${item.id}?edit=1`}>
                            <Pencil className="size-4" />
                            Chỉnh sửa
                        </Link>
                    </Button>
                </footer>
            </DialogContent>
        </Dialog>
    );
}

function OverviewTab({
    summary,
    seniority,
    content,
    skills,
    requirements,
    hasDetailedAnalysis,
}: {
    summary: string;
    seniority?: string | null;
    content: string;
    skills: string[];
    requirements: string[];
    hasDetailedAnalysis: boolean;
}) {
    return (
        <div className="space-y-4">
            <Panel icon={<FileText />} title="Giới thiệu">
                <p className="text-sm leading-6 text-slate-600">{summary}</p>
            </Panel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoCard
                    icon={<BriefcaseBusiness />}
                    label="Cấp bậc"
                    value={
                        seniority ? experienceLabel(seniority) : 'Chưa cập nhật'
                    }
                />
                <InfoCard
                    icon={<Timer />}
                    label="Kinh nghiệm"
                    value={extractExperience(requirements)}
                />
                <InfoCard
                    icon={<MapPin />}
                    label="Địa điểm"
                    value={extractLocation(content)}
                />
            </div>
            <Panel icon={<Code2 />} title="Công nghệ chính">
                <SkillList
                    skills={skills}
                    emptyText="AI chưa nhận diện được kỹ năng chính."
                />
            </Panel>
            <Panel icon={<ListChecks />} title="Tóm tắt yêu cầu">
                <BulletList
                    items={requirements.slice(0, 5)}
                    emptyText={
                        hasDetailedAnalysis
                            ? 'Kết quả phân tích chưa có yêu cầu chi tiết.'
                            : 'Mở trang chi tiết để xem nội dung JD đầy đủ.'
                    }
                />
            </Panel>
        </div>
    );
}

function RequirementsTab({
    requirements,
    responsibilities,
    hasDetailedAnalysis,
}: {
    requirements: string[];
    responsibilities: string[];
    hasDetailedAnalysis: boolean;
}) {
    return (
        <div className="space-y-4">
            <Panel icon={<ListChecks />} title="Yêu cầu ứng viên">
                <BulletList
                    items={requirements}
                    emptyText={
                        hasDetailedAnalysis
                            ? 'Kết quả phân tích chưa có yêu cầu chi tiết.'
                            : 'Chưa có dữ liệu yêu cầu đã được phân tích.'
                    }
                />
            </Panel>
            {responsibilities.length > 0 && (
                <Panel icon={<BriefcaseBusiness />} title="Trách nhiệm chính">
                    <BulletList items={responsibilities} />
                </Panel>
            )}
        </div>
    );
}

function SkillsTab({ skills }: { skills: string[] }) {
    return (
        <Panel icon={<Code2 />} title="Kỹ năng và công nghệ">
            <SkillList
                skills={skills}
                emptyText="Chưa nhận diện được kỹ năng từ mô tả này."
            />
        </Panel>
    );
}

function AnalysisTab({
    summary,
    detectedRole,
    seniority,
    interviewFocus,
    hasAnalysis,
}: {
    summary?: string | null;
    detectedRole?: string | null;
    seniority?: string | null;
    interviewFocus: string[];
    hasAnalysis: boolean;
}) {
    if (!hasAnalysis)
        return (
            <Panel icon={<FileText />} title="Chưa có kết quả phân tích">
                <p className="text-sm leading-6 font-medium text-slate-700">
                    Hãy mở trang chi tiết và phân tích JD để nhận diện vai trò,
                    cấp độ và trọng tâm phỏng vấn.
                </p>
            </Panel>
        );
    return (
        <div className="space-y-4">
            <Panel icon={<FileText />} title="Nhận định của AI">
                <p className="text-sm leading-6 font-medium text-slate-700">
                    {summary || 'Chưa có nhận định tổng quan.'}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoCard
                        icon={<BriefcaseBusiness />}
                        label="Vai trò"
                        value={detectedRole || 'Chưa xác định'}
                    />
                    <InfoCard
                        icon={<Timer />}
                        label="Cấp độ"
                        value={seniority || 'Chưa xác định'}
                    />
                </div>
            </Panel>
            <Panel icon={<ListChecks />} title="Trọng tâm phỏng vấn">
                <BulletList
                    items={interviewFocus}
                    emptyText="Chưa có trọng tâm phỏng vấn."
                />
            </Panel>
        </div>
    );
}

function Panel({
    icon,
    title,
    children,
}: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_8px_24px_rgba(79,52,142,0.06)] sm:p-5">
            <h3 className="flex items-center gap-2.5 text-base font-black text-[#21123f]">
                <span className="text-primary [&>svg]:size-5 [&>svg]:stroke-[2.5]">
                    {icon}
                </span>
                {title}
            </h3>
            <div className="mt-3">{children}</div>
        </section>
    );
}

function InfoCard({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-0 rounded-xl bg-violet-50/80 p-4 ring-1 ring-violet-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <span className="text-primary [&>svg]:size-5 [&>svg]:stroke-[2.5]">
                    {icon}
                </span>
                {label}
            </div>
            <p className="mt-1.5 truncate text-sm font-black text-[#21123f]">
                {value}
            </p>
        </div>
    );
}

function AnalysisStatus({ status }: { status?: string }) {
    if (status === 'COMPLETED')
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-4" />
                Đã phân tích
            </span>
        );
    if (status === 'FAILED')
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600">
                <XCircle className="size-4" />
                Thất bại
            </span>
        );
    return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
            Chưa phân tích
        </span>
    );
}

function SkillList({
    skills,
    emptyText,
}: {
    skills: string[];
    emptyText: string;
}) {
    if (skills.length === 0)
        return <p className="text-sm text-slate-500">{emptyText}</p>;
    return (
        <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
                <span
                    key={skill}
                    className="text-primary rounded-full bg-violet-100 px-3 py-1.5 text-xs font-extrabold ring-1 ring-violet-200/70"
                >
                    {skill}
                </span>
            ))}
        </div>
    );
}

function BulletList({
    items,
    emptyText = 'Chưa có dữ liệu.',
}: {
    items: string[];
    emptyText?: string;
}) {
    if (items.length === 0)
        return <p className="text-sm leading-6 text-slate-500">{emptyText}</p>;
    return (
        <ul className="space-y-2.5">
            {items.map((item, index) => (
                <li
                    key={`${item}-${index}`}
                    className="flex gap-2.5 text-sm leading-6 font-medium text-slate-700"
                >
                    <Check
                        className="text-primary mt-1 size-4 shrink-0"
                        strokeWidth={3}
                    />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

function QuickViewSkeleton() {
    return (
        <div className="mt-5 space-y-4">
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((item) => (
                    <div
                        key={item}
                        className="h-24 animate-pulse rounded-xl bg-slate-100"
                    />
                ))}
            </div>
            <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
        </div>
    );
}

function countWords(value: string) {
    return value.trim() ? value.trim().split(/\s+/).length : 0;
}
function excerpt(value: string, maxLength: number) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > maxLength
        ? `${normalized.slice(0, maxLength).trim()}…`
        : normalized;
}
function formatDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}
function extractExperience(requirements: string[]) {
    const match = requirements
        .join(' ')
        .match(
            /\b(\d+\s*(?:-|–|đến|to)\s*\d+\s*(?:năm|years?)|\d+\+?\s*(?:năm|years?))\b/i,
        );
    return match?.[1] ?? 'Chưa cập nhật';
}
function extractLocation(content: string) {
    const normalized = content.replace(/\s+/g, ' ').trim();
    const patterns = [
        /(?:địa điểm|nơi làm việc|location|work location)\s*[:\-]\s*([^.;|]{2,100})/i,
        /(?:làm việc|văn phòng|work|working|office)(?:\s+\S+){0,3}\s+(?:tại|ở|in)\s+([^.;|]{2,100})/i,
    ];

    for (const pattern of patterns) {
        const value = normalized.match(pattern)?.[1]?.trim();
        if (value) return value.replace(/[,\s]+$/, '');
    }

    return 'Chưa cập nhật';
}
function experienceLabel(seniority: string) {
    const normalized = seniority.toUpperCase();
    if (normalized.includes('INTERN')) return 'Thực tập sinh';
    if (normalized.includes('FRESHER')) return 'Fresher';
    if (normalized.includes('JUNIOR')) return 'Junior';
    if (normalized.includes('MIDDLE') || normalized.includes('MID'))
        return 'Mid-level';
    if (normalized.includes('SENIOR')) return 'Senior';
    if (normalized.includes('LEAD')) return 'Lead';
    return seniority;
}
