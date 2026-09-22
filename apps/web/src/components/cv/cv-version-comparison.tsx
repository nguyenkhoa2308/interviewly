'use client';

import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCvVersionComparison, useCvVersions } from '@/hooks/cv';
import type { CvVersion, CvVersionComparison } from '@/types/cv';

export function CvVersionComparisonPanel({
    cvId,
    versions,
}: {
    cvId: string;
    versions: CvVersion[];
}) {
    const ready = versions.filter(
        (version) => version.processingStatus === 'READY',
    );
    const [fromId, setFromId] = useState(() => ready[1]?.id ?? '');
    const [toId, setToId] = useState(() => ready[0]?.id ?? '');

    const query = useCvVersionComparison(cvId, fromId, toId);

    if (ready.length < 2) {
        return (
            <div className="rounded-xl border border-violet-100 bg-violet-50/45 px-4 py-3 text-sm font-semibold text-slate-600">
                Cần ít nhất hai phiên bản đã xử lý để so sánh.
            </div>
        );
    }

    return (
        <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/45 p-4">
            <div>
                <h3 className="font-extrabold text-slate-950">
                    So sánh phiên bản
                </h3>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                    Dựa trên kết quả phân tích gần nhất của mỗi phiên bản.
                </p>
            </div>
            <div className="mt-4 grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <VersionSelect
                    value={fromId}
                    onChange={setFromId}
                    versions={ready}
                    excludedId={toId}
                    label="Bản trước"
                />
                <ArrowRight
                    className="text-primary mx-auto hidden size-4 sm:block"
                    aria-hidden="true"
                />
                <VersionSelect
                    value={toId}
                    onChange={setToId}
                    versions={ready}
                    excludedId={fromId}
                    label="Bản sau"
                />
            </div>

            {query.isPending ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-20 animate-pulse rounded-xl bg-white/90"
                        />
                    ))}
                </div>
            ) : query.isError ? (
                <p
                    role="alert"
                    className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                >
                    {query.error.message}
                </p>
            ) : query.data?.comparison ? (
                <CvComparisonResult data={query.data} />
            ) : query.data ? (
                <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    {query.data.from.analysis ? 'Bản sau' : 'Bản trước'} chưa có
                    kết quả phân tích. Hãy chọn phiên bản đó làm bản hiện hành
                    và phân tích trước.
                </p>
            ) : null}
        </section>
    );
}

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

function VersionSelect({
    value,
    onChange,
    versions,
    excludedId,
    label,
}: {
    value: string;
    onChange: (value: string) => void;
    versions: CvVersion[];
    excludedId: string;
    label: string;
}) {
    return (
        <div>
            <p className="mb-1.5 text-xs font-bold text-slate-500">{label}</p>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Chọn phiên bản" />
                </SelectTrigger>
                <SelectContent>
                    {versions.map((version) => (
                        <SelectItem
                            key={version.id}
                            value={version.id}
                            disabled={version.id === excludedId}
                        >
                            Phiên bản {version.versionNumber} ·{' '}
                            {version.originalFilename}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
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
