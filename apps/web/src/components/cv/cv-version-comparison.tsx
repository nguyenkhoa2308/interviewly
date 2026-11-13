'use client';

import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { useCvVersionComparison, useCvVersions } from '@/hooks/cv';
import type { CvVersionComparison } from '@/types/cv';

export function AutomaticVersionComparison({ cvId }: { cvId: string }) {
    const versionsQuery = useCvVersions(cvId);
    const ready = versionsQuery.data?.filter(
        (version) => version.processingStatus === 'READY',
    );
    const current = ready?.find((version) => version.isCurrent);
    const previous = ready
        ?.filter(
            (version) =>
                current && version.versionNumber < current.versionNumber,
        )
        .toSorted((a, b) => b.versionNumber - a.versionNumber)[0];
    const comparisonQuery = useCvVersionComparison(
        cvId,
        previous?.id,
        current?.id,
    );

    if (!current || !previous) return null;

    return (
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_10px_32px_rgba(52,38,103,0.05)] sm:p-6">
            <h2 className="font-extrabold text-slate-950">
                Thay đổi so với phiên bản trước
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
                Tự động so sánh phiên bản {previous.versionNumber} với phiên bản{' '}
                {current.versionNumber} hiện tại.
            </p>
            {comparisonQuery.isPending ? (
                <div className="mt-4 h-28 animate-pulse rounded-xl bg-slate-100" />
            ) : comparisonQuery.data?.comparison ? (
                <CvComparisonResult data={comparisonQuery.data} />
            ) : (
                <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Phiên bản trước chưa có kết quả phân tích nên chưa thể đối
                    chiếu tự động.
                </p>
            )}
        </section>
    );
}

export function CvComparisonResult({ data }: { data: CvVersionComparison }) {
    const comparison = data.comparison!;
    return (
        <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric
                    label="Điểm AI"
                    value={formatDelta(comparison.scoreDelta)}
                    delta={comparison.scoreDelta}
                />
                <Metric
                    label="Điểm mạnh"
                    value={formatDelta(comparison.strengthCountDelta)}
                    delta={comparison.strengthCountDelta}
                />
                <Metric
                    label="Điểm yếu"
                    value={formatInverseDelta(comparison.weaknessCountDelta)}
                    delta={-comparison.weaknessCountDelta}
                />
                <Metric
                    label="Rủi ro"
                    value={formatInverseDelta(comparison.riskCountDelta)}
                    delta={-comparison.riskCountDelta}
                />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <SkillGroup
                    title="Kỹ năng mới"
                    skills={comparison.skills.added}
                    tone="positive"
                />
                <SkillGroup
                    title="Kỹ năng không còn nhận diện"
                    skills={comparison.skills.removed}
                    tone="negative"
                />
            </div>
            <div className="rounded-xl bg-white/80 px-4 py-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-100">
                Vai trò: {data.from.analysis?.detectedRole ?? '—'}{' '}
                <ArrowRight className="mx-1 inline size-3" />{' '}
                {data.to.analysis?.detectedRole ?? '—'}
            </div>
        </div>
    );
}

function Metric({
    label,
    value,
    delta,
}: {
    label: string;
    value: string;
    delta: number | null;
}) {
    const Icon =
        delta === null || delta === 0
            ? Minus
            : delta > 0
              ? TrendingUp
              : TrendingDown;
    return (
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p
                className={
                    'mt-1 flex items-center gap-1 text-lg font-extrabold ' +
                    (delta === null || delta === 0
                        ? 'text-slate-700'
                        : delta > 0
                          ? 'text-emerald-600'
                          : 'text-red-600')
                }
            >
                <Icon className="size-4" />
                {value}
            </p>
        </div>
    );
}

function SkillGroup({
    title,
    skills,
    tone,
}: {
    title: string;
    skills: string[];
    tone: 'positive' | 'negative';
}) {
    return (
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <p className="text-xs font-extrabold text-slate-700">{title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.length ? (
                    skills.map((skill) => (
                        <span
                            key={skill}
                            className={
                                'rounded-full px-2 py-1 text-[11px] font-bold ' +
                                (tone === 'positive'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-700')
                            }
                        >
                            {skill}
                        </span>
                    ))
                ) : (
                    <span className="text-xs font-medium text-slate-400">
                        Không có thay đổi
                    </span>
                )}
            </div>
        </div>
    );
}

function formatDelta(value: number | null) {
    if (value === null) return '—';
    return value > 0 ? `+${value}` : String(value);
}

function formatInverseDelta(value: number) {
    if (value === 0) return '0';
    return value < 0 ? `Giảm ${Math.abs(value)}` : `Tăng ${value}`;
}
