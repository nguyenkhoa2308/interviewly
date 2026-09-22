'use client';

import {
    ArrowLeft,
    BrainCircuit,
    CircleAlert,
    Clock3,
    Gauge,
    LoaderCircle,
    RefreshCw,
    RotateCcw,
    Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    DetailedAnalysisReport,
    getCvAnalysisErrorMessage,
} from '@/components/cv/cv-analysis-section';
import { Button } from '@/components/ui/button';
import {
    useAnalyzeCv,
    useCv,
    useCvAnalysisHistory,
    useLatestCvAnalysis,
} from '@/hooks/cv';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api-error';
import { formatCvDate } from '@/lib/cv-formatters';
import type { CvAnalysis, CvAnalysisStatus, ExperienceLevel } from '@/types/cv';
import { AutomaticVersionComparison } from '@/components/cv/cv-version-comparison';

export function CvAnalysisResultPage({ cvId }: { cvId: string }) {
    const cvQuery = useCv(cvId);
    const analysisQuery = useLatestCvAnalysis(cvId);
    const analyzeMutation = useAnalyzeCv();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const analyzeAgain = async () => {
        if (analyzeMutation.isPending) return;
        try {
            await analyzeMutation.mutateAsync({ cvId });
            setConfirmOpen(false);
            toast.success('Đã hoàn thành bản phân tích mới.');
        } catch (error) {
            toast.error('Không thể phân tích lại CV', {
                description: getCvAnalysisErrorMessage(error),
            });
        }
    };

    return (
        <main className="mx-auto w-full max-w-[1600px] min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <Button asChild variant="ghost" className="-ml-3 text-slate-600">
                <Link href={`/cv/${cvId}`} className="!text-primary !font-bold">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Quay lại CV
                </Link>
            </Button>

            {cvQuery.isPending || analysisQuery.isPending ? (
                <AnalysisPageSkeleton />
            ) : cvQuery.isError ? (
                <AnalysisPageError
                    title="Không thể tải CV"
                    notFound={isNotFound(cvQuery.error, 'CV_NOT_FOUND')}
                    onRetry={() => void cvQuery.refetch()}
                    backHref="/cv"
                />
            ) : analysisQuery.isError ? (
                <AnalysisPageError
                    title="Không thể tải kết quả phân tích"
                    notFound={false}
                    onRetry={() => void analysisQuery.refetch()}
                    backHref={`/cv/${cvId}`}
                />
            ) : !analysisQuery.data ? (
                <NoAnalysisState cvId={cvId} />
            ) : (
                <AnalysisResult
                    cvName={cvQuery.data.name}
                    analysis={analysisQuery.data}
                    analyzing={analyzeMutation.isPending}
                    onRequestAnalyzeAgain={() => setConfirmOpen(true)}
                />
            )}

            {analysisQuery.data && <AutomaticVersionComparison cvId={cvId} />}

            {cvQuery.data && !cvQuery.isPending && !cvQuery.isError && (
                <AnalysisHistory cvId={cvId} />
            )}

            <Dialog
                open={confirmOpen}
                onOpenChange={(open) =>
                    !analyzeMutation.isPending && setConfirmOpen(open)
                }
            >
                <DialogContent className="max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle>Phân tích lại CV?</DialogTitle>
                        <DialogDescription>
                            Một lần phân tích mới sẽ được tạo. Kết quả hiện tại
                            vẫn được giữ trong lịch sử.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-5">
                        <Button
                            variant="outline"
                            disabled={analyzeMutation.isPending}
                            onClick={() => setConfirmOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            disabled={analyzeMutation.isPending}
                            onClick={() => void analyzeAgain()}
                        >
                            {analyzeMutation.isPending
                                ? 'Đang phân tích...'
                                : 'Phân tích lại'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}

function AnalysisResult({
    cvName,
    analysis,
    analyzing,
    onRequestAnalyzeAgain,
}: {
    cvName: string;
    analysis: CvAnalysis;
    analyzing: boolean;
    onRequestAnalyzeAgain: () => void;
}) {
    const analyzedAt = analysis.completedAt ?? analysis.createdAt;

    return (
        <div className="mt-4 min-w-0 space-y-6">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="text-primary text-xs font-extrabold tracking-[0.16em] uppercase">
                        Báo cáo AI
                    </p>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
                        Phân tích CV
                    </h1>
                    <p className="mt-1 text-sm font-semibold break-words text-slate-500">
                        {cvName} · Hoàn thành {formatCvDate(analyzedAt)}
                    </p>
                </div>
                <Button
                    className="w-full rounded-sm font-semibold sm:w-auto"
                    disabled={analyzing}
                    onClick={onRequestAnalyzeAgain}
                >
                    {analyzing ? (
                        <LoaderCircle
                            className="size-4 animate-spin"
                            aria-hidden="true"
                            strokeWidth={2.5}
                        />
                    ) : (
                        <RotateCcw
                            className="size-4"
                            aria-hidden="true"
                            strokeWidth={2.5}
                        />
                    )}
                    {analyzing ? 'Đang phân tích...' : 'Phân tích lại'}
                </Button>
            </header>

            {analyzing && (
                <div
                    className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <LoaderCircle
                        className="size-4 shrink-0 animate-spin"
                        aria-hidden="true"
                    />
                    Báo cáo hiện tại vẫn được giữ trong khi Interviewly tạo phân
                    tích mới.
                </div>
            )}

            <section
                className="grid overflow-hidden rounded-2xl border border-violet-100 bg-[radial-gradient(circle_at_12%_20%,rgba(139,92,246,0.08),transparent_28%),white] shadow-[0_14px_42px_rgba(52,38,103,0.05)] lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]"
                aria-labelledby="analysis-overview-heading"
            >
                <div className="flex flex-col justify-center border-b border-violet-100 p-6 sm:p-8 lg:border-r lg:border-b-0">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
                        <Gauge
                            className="text-primary size-5"
                            aria-hidden="true"
                        />
                        Điểm tổng quan
                    </div>
                    {analysis.overallScore === null ? (
                        <p className="mt-6 text-2xl font-extrabold text-slate-500">
                            Chưa có điểm đánh giá
                        </p>
                    ) : (
                        <div className="mt-5 flex items-center gap-5">
                            <div
                                className="relative grid size-32 shrink-0 place-items-center rounded-full p-2"
                                role="img"
                                aria-label={`Điểm tổng quan ${analysis.overallScore} trên 100`}
                                style={{
                                    background: `conic-gradient(var(--primary) ${Math.min(100, Math.max(0, analysis.overallScore)) * 3.6}deg, rgb(237 233 254) 0deg)`,
                                }}
                            >
                                <div className="grid size-full place-items-center rounded-full bg-white shadow-inner">
                                    <span className="text-center">
                                        <strong className="block text-4xl leading-none font-black tracking-tight text-slate-950">
                                            {analysis.overallScore}
                                        </strong>
                                        <span className="mt-1 block text-xs font-extrabold text-slate-400">
                                            trên 100
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <p className="font-extrabold text-slate-900">
                                    Đánh giá tổng thể
                                </p>
                                <p className="mt-1 max-w-48 text-sm leading-6 font-medium text-slate-500">
                                    Điểm được tổng hợp từ nội dung và mức độ sẵn
                                    sàng của CV.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col justify-center p-6 sm:p-8">
                    <div className="flex items-start gap-3">
                        <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <BrainCircuit
                                className="size-5"
                                aria-hidden="true"
                            />
                        </span>
                        <div>
                            <h2
                                id="analysis-overview-heading"
                                className="text-xl font-extrabold text-slate-950"
                            >
                                Hồ sơ được nhận diện
                            </h2>
                            <p className="mt-1 text-sm leading-6 font-medium text-slate-500">
                                Vai trò và cấp độ được AI suy ra từ nội dung CV.
                            </p>
                        </div>
                    </div>
                    <dl className="mt-6 grid gap-5 border-t border-violet-100 pt-5 sm:grid-cols-2 sm:divide-x sm:divide-violet-100">
                        {analysis.detectedRole && (
                            <OverviewValue
                                label="Vai trò"
                                value={analysis.detectedRole}
                            />
                        )}
                        {analysis.detectedLevel && (
                            <OverviewValue
                                label="Cấp độ"
                                value={formatExperienceLevel(
                                    analysis.detectedLevel,
                                )}
                            />
                        )}
                    </dl>
                </div>
            </section>

            <DetailedAnalysisReport analysis={analysis} />
        </div>
    );
}

function AnalysisHistory({ cvId }: { cvId: string }) {
    const [page, setPage] = useState(1);
    const historyQuery = useCvAnalysisHistory(cvId, { page, limit: 5 });

    return (
        <section
            className="mt-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_14px_42px_rgba(52,38,103,0.04)] sm:p-6"
            aria-labelledby="analysis-history-heading"
        >
            <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <Clock3 className="size-5" aria-hidden="true" />
                </span>
                <div>
                    <h2
                        id="analysis-history-heading"
                        className="text-lg font-extrabold text-slate-950"
                    >
                        Lịch sử phân tích
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        Mỗi lần chạy được lưu riêng, mới nhất hiển thị trước.
                    </p>
                </div>
            </div>

            {historyQuery.isPending ? (
                <div className="mt-5 space-y-2" aria-label="Đang tải lịch sử">
                    {[0, 1, 2].map((item) => (
                        <div
                            key={item}
                            className="h-16 animate-pulse rounded-xl bg-slate-100"
                        />
                    ))}
                </div>
            ) : historyQuery.isError ? (
                <div className="mt-5 flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Không thể tải lịch sử. Báo cáo hiện tại vẫn dùng được.
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void historyQuery.refetch()}
                    >
                        Thử lại
                    </Button>
                </div>
            ) : historyQuery.data.items.length === 0 ? (
                <p className="mt-5 text-sm font-medium text-slate-500">
                    Chưa có lần phân tích nào.
                </p>
            ) : (
                <>
                    <div className="mt-5 divide-y divide-slate-100">
                        {historyQuery.data.items.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800">
                                        {formatAnalysisDateTime(item.createdAt)}
                                    </p>
                                    {item.status === 'COMPLETED' &&
                                        item.detectedRole && (
                                            <p className="mt-1 truncate text-sm font-medium text-slate-500">
                                                {item.detectedRole}
                                            </p>
                                        )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {item.status === 'COMPLETED' &&
                                        item.overallScore !== null && (
                                            <span className="text-sm font-extrabold text-slate-700">
                                                {item.overallScore}/100
                                            </span>
                                        )}
                                    <AnalysisStatus status={item.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                    {historyQuery.data.pagination.totalPages > 1 && (
                        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage((value) => value - 1)}
                            >
                                Trang trước
                            </Button>
                            <span className="text-sm font-bold text-slate-500">
                                {page}/{historyQuery.data.pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    page ===
                                    historyQuery.data.pagination.totalPages
                                }
                                onClick={() => setPage((value) => value + 1)}
                            >
                                Trang sau
                            </Button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function AnalysisStatus({ status }: { status: CvAnalysisStatus }) {
    const styles = {
        COMPLETED: 'bg-emerald-50 text-emerald-700',
        PROCESSING: 'bg-amber-50 text-amber-700',
        FAILED: 'bg-red-50 text-red-700',
    }[status];
    const labels = {
        COMPLETED: 'Hoàn thành',
        PROCESSING: 'Đang xử lý',
        FAILED: 'Thất bại',
    }[status];

    return (
        <span
            className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${styles}`}
        >
            {labels}
        </span>
    );
}

function formatAnalysisDateTime(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function OverviewValue({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 sm:pr-5 sm:last:pr-0 sm:last:pl-5">
            <dt className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                {label}
            </dt>
            <dd className="mt-1.5 text-lg font-extrabold break-words text-slate-900">
                {value}
            </dd>
        </div>
    );
}

function NoAnalysisState({ cvId }: { cvId: string }) {
    return (
        <section className="mt-4 flex min-h-96 flex-col items-center justify-center rounded-2xl border border-violet-100 bg-white px-5 py-12 text-center">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
                <Sparkles className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold text-slate-950">
                CV chưa có bản phân tích
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 font-medium text-slate-500">
                Hãy quay lại trang chi tiết CV để bắt đầu phân tích bằng AI.
            </p>
            <Button asChild className="mt-5">
                <Link href={`/cv/${cvId}`}>Về chi tiết CV</Link>
            </Button>
        </section>
    );
}

function AnalysisPageError({
    title,
    notFound,
    onRetry,
    backHref,
}: {
    title: string;
    notFound: boolean;
    onRetry: () => void;
    backHref: string;
}) {
    return (
        <section className="mt-4 flex min-h-96 flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-5 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <CircleAlert className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold text-slate-950">
                {notFound ? 'Không tìm thấy CV' : title}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 font-medium text-slate-500">
                {notFound
                    ? 'CV không tồn tại hoặc bạn không có quyền truy cập.'
                    : 'Dữ liệu khác của CV không bị ảnh hưởng. Bạn có thể thử tải lại riêng báo cáo này.'}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline">
                    <Link href={backHref}>Quay lại</Link>
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

function AnalysisPageSkeleton() {
    return (
        <div
            className="mt-4 space-y-6"
            aria-label="Đang tải báo cáo phân tích CV"
            aria-busy="true"
        >
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
            <div className="grid gap-6 md:grid-cols-2">
                <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            </div>
        </div>
    );
}

function isNotFound(error: unknown, code: string) {
    return (
        error instanceof ApiError &&
        (error.statusCode === 404 || error.code === code)
    );
}

function formatExperienceLevel(level: ExperienceLevel) {
    return {
        INTERN: 'Thực tập sinh',
        FRESHER: 'Fresher',
        JUNIOR: 'Junior',
        MIDDLE: 'Middle',
        SENIOR: 'Senior',
        LEAD: 'Lead',
    }[level];
}
