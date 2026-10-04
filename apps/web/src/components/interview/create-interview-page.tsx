'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useCreateInterview,
    useInterviewOptions,
} from '@/hooks/interview/use-interviews';
import type { Difficulty, InterviewType } from '@/types/interview';
const durations = [15, 30, 45, 60] as const;
const countRange = {
    15: { min: 4, max: 6 },
    30: { min: 7, max: 10 },
    45: { min: 9, max: 13 },
    60: { min: 11, max: 16 },
} as const;
export function CreateInterviewPage() {
    const router = useRouter(),
        params = useSearchParams(),
        options = useInterviewOptions(),
        mutation = useCreateInterview();
    const match = options.data?.matches.find(
        (x) => x.id === params.get('matchId'),
    );
    const [cv, setCv] = useState(''),
        [jd, setJd] = useState(''),
        [role, setRole] = useState(''),
        [type, setType] = useState<InterviewType>('TECHNICAL'),
        [difficulty, setDifficulty] = useState<Difficulty>('ADAPTIVE'),
        [duration, setDuration] = useState<15 | 30 | 45 | 60>(30),
        [count, setCount] = useState(8),
        [focus, setFocus] = useState('');
    const cvId = cv || match?.cvId || '',
        jdId = jd || match?.jobDescriptionId || '';
    async function submit() {
        if (!cvId || !jdId || role.trim().length < 2)
            return toast.error(
                'Vui lòng chọn CV, JD và nhập vai trò mục tiêu.',
            );
        try {
            const x = await mutation.mutateAsync({
                cvId,
                jobDescriptionId: jdId,
                cvJdMatchId: match?.id,
                interviewType: type,
                difficulty,
                durationMinutes: duration,
                questionCount: count,
                focusAreas: focus
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .slice(0, 8),
                targetRole: role.trim(),
            });
            toast.success('Kế hoạch phỏng vấn đã sẵn sàng');
            router.push('/interviews/' + x.id);
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : 'Không thể tạo kế hoạch.',
            );
        }
    }
    return (
        <main className="mx-auto w-full max-w-[1280px] p-4 sm:p-8">
            <Link
                href="/interviews"
                className="text-primary inline-flex items-center gap-2 text-sm font-bold"
            >
                <ArrowLeft className="size-4" />
                Phỏng vấn
            </Link>
            <header className="mt-5 max-w-3xl">
                <p className="text-primary text-xs font-bold tracking-[.18em] uppercase">
                    Tạo buổi luyện tập
                </p>
                <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
                    Xây dựng kế hoạch phỏng vấn phù hợp với bạn
                </h1>
                <p className="mt-3 text-slate-500">
                    Chọn nguồn đã phân tích và cấu hình mục tiêu. AI sẽ tạo
                    blueprint, chưa bắt đầu buổi phỏng vấn.
                </p>
            </header>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Card icon={FileText} title="Nguồn phỏng vấn">
                    <Field label="CV đã phân tích">
                        <Select value={cvId} onValueChange={setCv}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn CV" />
                            </SelectTrigger>
                            <SelectContent>
                                {options.data?.cvs.map((x) => (
                                    <SelectItem key={x.id} value={x.id}>
                                        {x.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Mô tả công việc đã phân tích">
                        <Select value={jdId} onValueChange={setJd}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn JD" />
                            </SelectTrigger>
                            <SelectContent>
                                {options.data?.jobDescriptions.map((x) => (
                                    <SelectItem key={x.id} value={x.id}>
                                        {x.title}
                                        {x.company ? ' · ' + x.company : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    {match && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                            Dùng kết quả đối chiếu {match.matchScore ?? '—'}%
                            làm ngữ cảnh.
                        </div>
                    )}
                </Card>
                <Card icon={Target} title="Cấu hình">
                    <Field label="Vai trò mục tiêu">
                        <Input
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="Backend Developer"
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Loại">
                            <Select
                                value={type}
                                onValueChange={(v) =>
                                    setType(v as InterviewType)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        ['TECHNICAL', 'Kỹ thuật'],
                                        ['BEHAVIORAL', 'Hành vi'],
                                        ['HR', 'Nhân sự'],
                                        ['FULL', 'Toàn diện'],
                                    ].map((x) => (
                                        <SelectItem key={x[0]} value={x[0]}>
                                            {x[1]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Độ khó">
                            <Select
                                value={difficulty}
                                onValueChange={(v) =>
                                    setDifficulty(v as Difficulty)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        ['ADAPTIVE', 'Thích ứng'],
                                        ['EASY', 'Cơ bản'],
                                        ['MEDIUM', 'Trung bình'],
                                        ['HARD', 'Nâng cao'],
                                    ].map((x) => (
                                        <SelectItem key={x[0]} value={x[0]}>
                                            {x[1]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Thời lượng">
                            <Select
                                value={String(duration)}
                                onValueChange={(v) => {
                                    const next = Number(v) as typeof duration;
                                    setDuration(next);
                                    setCount((current) =>
                                        Math.min(
                                            countRange[next].max,
                                            Math.max(
                                                countRange[next].min,
                                                current,
                                            ),
                                        ),
                                    );
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {durations.map((x) => (
                                        <SelectItem key={x} value={String(x)}>
                                            {x} phút
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Số câu hỏi">
                            <Input
                                type="number"
                                min={countRange[duration].min}
                                max={countRange[duration].max}
                                value={count}
                                onChange={(e) => setCount(+e.target.value)}
                            />
                            <p className="-mt-2 text-xs text-slate-400">
                                Phù hợp: {countRange[duration].min}–
                                {countRange[duration].max} câu, đã gồm phần kết
                                thúc.
                            </p>
                        </Field>
                    </div>
                    <Field label="Trọng tâm, cách nhau bằng dấu phẩy">
                        <Input
                            value={focus}
                            onChange={(e) => setFocus(e.target.value)}
                            placeholder="REST API, system design, teamwork"
                        />
                    </Field>
                    <Button
                        className="h-12 w-full rounded-lg font-bold"
                        disabled={mutation.isPending || options.isPending}
                        onClick={submit}
                    >
                        <Sparkles />
                        {mutation.isPending
                            ? 'Đang tạo kế hoạch...'
                            : 'Tạo kế hoạch phỏng vấn'}
                    </Button>
                </Card>
            </div>
        </main>
    );
}
function Card({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof FileText;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="flex items-center gap-3 text-lg font-extrabold">
                <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                    <Icon className="size-5" />
                </span>
                {title}
            </h2>
            {children}
        </section>
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
            <Label>{label}</Label>
            {children}
        </div>
    );
}
