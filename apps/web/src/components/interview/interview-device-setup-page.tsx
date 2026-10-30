'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
    CheckCircle2,
    CircleAlert,
    Headphones,
    LoaderCircle,
    Mic,
    MicOff,
    Play,
    ShieldCheck,
    Volume2,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { Button } from '@/components/ui/button';
import {
    useInterview,
    useStartInterview,
} from '@/hooks/interview/use-interviews';
import { useSettings } from '@/hooks/settings/use-settings';
import {
    getSpeechRecognitionConstructor,
    resolveVietnameseSpeechVoice,
    supportsSpeechSynthesis,
    writeInterviewVoicePreference,
    type InterviewInputMode,
    type InterviewOutputMode,
} from '@/lib/interview-voice';
import { cn } from '@/lib/utils';

type CheckState = 'IDLE' | 'CHECKING' | 'PASS' | 'FAIL';

export function InterviewDeviceSetupPage({ id }: { id: string }) {
    const router = useRouter();
    const interview = useInterview(id);
    const settings = useSettings();
    const startInterview = useStartInterview(id);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const recordingUrlRef = useRef<string | null>(null);
    const [microphone, setMicrophone] = useState<CheckState>('IDLE');
    const [speechInput, setSpeechInput] = useState<CheckState>('IDLE');
    const [speechOutput, setSpeechOutput] = useState<CheckState>('IDLE');
    const [heardText, setHeardText] = useState('');
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

    const cleanup = useCallback(() => {
        recognitionRef.current?.abort();
        recognitionRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (recordingUrlRef.current) {
            URL.revokeObjectURL(recordingUrlRef.current);
            recordingUrlRef.current = null;
        }
        window.speechSynthesis?.cancel();
    }, []);
    useEffect(() => cleanup, [cleanup]);

    useEffect(() => {
        if (interview.data?.status === 'IN_PROGRESS') {
            router.replace(`/interviews/${id}/session`);
        }
    }, [id, interview.data?.status, router]);

    async function checkMicrophone() {
        setMicrophone('CHECKING');
        setRecordingUrl(null);
        try {
            cleanup();
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = stream;
            const AudioContextConstructor = window.AudioContext;
            const context = new AudioContextConstructor();
            const analyser = context.createAnalyser();
            const source = context.createMediaStreamSource(stream);
            source.connect(analyser);
            const samples = new Uint8Array(analyser.fftSize);
            let peak = 0;
            const chunks: BlobPart[] = [];
            const recorder =
                typeof MediaRecorder !== 'undefined'
                    ? new MediaRecorder(stream)
                    : null;
            if (recorder) {
                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) chunks.push(event.data);
                };
                recorder.start();
            }
            for (let attempt = 0; attempt < 30; attempt += 1) {
                analyser.getByteTimeDomainData(samples);
                peak = Math.max(
                    peak,
                    ...Array.from(samples, (sample) => Math.abs(sample - 128)),
                );
                await new Promise((resolve) => window.setTimeout(resolve, 100));
            }
            let recordedBytes = 0;
            if (recorder) {
                await new Promise<void>((resolve) => {
                    recorder.onstop = () => {
                        const recording = new Blob(chunks, {
                            type: recorder.mimeType || 'audio/webm',
                        });
                        recordedBytes = recording.size;
                        if (recordedBytes > 0) {
                            const url = URL.createObjectURL(recording);
                            recordingUrlRef.current = url;
                            setRecordingUrl(url);
                        }
                        resolve();
                    };
                    recorder.stop();
                });
            }
            await context.close();
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setMicrophone(peak > 1 && recordedBytes > 0 ? 'PASS' : 'FAIL');
        } catch {
            setMicrophone('FAIL');
        }
    }

    function checkSpeechInput() {
        const Recognition = getSpeechRecognitionConstructor();
        if (!Recognition) {
            setSpeechInput('FAIL');
            return;
        }
        recognitionRef.current?.abort();
        setHeardText('');
        setSpeechInput('CHECKING');
        const recognition = new Recognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
            const text = Array.from(
                { length: event.results.length },
                (_, index) => event.results[index]?.[0]?.transcript ?? '',
            )
                .join(' ')
                .trim();
            setHeardText(text);
            if (text) setSpeechInput('PASS');
        };
        recognition.onerror = () => setSpeechInput('FAIL');
        recognition.onend = () =>
            setSpeechInput((current) =>
                current === 'PASS' ? current : 'FAIL',
            );
        recognitionRef.current = recognition;
        recognition.start();
    }

    function checkSpeechOutput() {
        if (!supportsSpeechSynthesis()) {
            setSpeechOutput('FAIL');
            return;
        }
        setSpeechOutput('CHECKING');
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
            'Xin chào, âm thanh phỏng vấn của Interviewly đang hoạt động.',
        );
        utterance.lang = 'vi-VN';
        utterance.rate = settings.data?.voiceAndAudio.speechSpeed ?? 1;
        utterance.volume = settings.data?.voiceAndAudio.volume ?? 1;
        const selected = resolveVietnameseSpeechVoice(
            window.speechSynthesis.getVoices(),
            settings.data?.voiceAndAudio.voiceName,
        );
        if (selected) utterance.voice = selected;
        utterance.onend = () => setSpeechOutput('PASS');
        utterance.onerror = () => setSpeechOutput('FAIL');
        window.speechSynthesis.speak(utterance);
    }

    async function enterRoom(inputMode: InterviewInputMode) {
        const outputMode: InterviewOutputMode =
            speechOutput === 'PASS' ? 'VOICE_AND_TEXT' : 'TEXT_ONLY';
        writeInterviewVoicePreference(id, { inputMode, outputMode });
        try {
            await startInterview.mutateAsync();
            cleanup();
            router.replace(`/interviews/${id}/session`);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể bắt đầu phỏng vấn.',
            );
        }
    }

    if (interview.isPending) return <SetupSkeleton />;
    if (!interview.data) return null;
    const voiceReady = microphone === 'PASS' && speechInput === 'PASS';

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <PageBreadcrumb
                items={[
                    { label: 'Phỏng vấn', href: '/interviews' },
                    {
                        label: interview.data.targetRole,
                        href: `/interviews/${id}`,
                    },
                    { label: 'Kiểm tra thiết bị' },
                ]}
            />
            <header className="mt-6 max-w-3xl">
                <p className="text-primary text-xs font-black tracking-[0.16em] uppercase">
                    Chuẩn bị trước phiên
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    Kiểm tra thiết bị
                </h1>
                <p className="mt-2 text-base leading-7 text-slate-600">
                    Xác nhận micro và âm thanh hoạt động trước khi vào phòng.
                    Bạn luôn có thể dùng chế độ văn bản.
                </p>
            </header>

            <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(68,49,126,0.07)]">
                    <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                        <h2 className="text-lg font-extrabold text-slate-950">
                            Thiết bị đầu vào và đầu ra
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Mỗi phép thử chỉ chạy khi bạn chủ động bấm nút.
                        </p>
                    </div>
                    <div className="divide-y divide-slate-100 px-5 sm:px-7">
                        <DeviceCheck
                            icon={Mic}
                            title="Micro"
                            description="Kiểm tra quyền truy cập và tín hiệu âm thanh thực tế."
                            state={microphone}
                            action="Kiểm tra micro"
                            onCheck={() => void checkMicrophone()}
                            extra={
                                recordingUrl ? (
                                    <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                                        <p className="mb-2 text-xs font-bold text-slate-600">
                                            {
                                                'Nghe l\u1ea1i \u0111o\u1ea1n thu th\u1eed'
                                            }
                                        </p>
                                        <audio
                                            className="h-10 w-full"
                                            controls
                                            preload="metadata"
                                            src={recordingUrl}
                                        >
                                            {
                                                'Tr\u00ecnh duy\u1ec7t kh\u00f4ng h\u1ed7 tr\u1ee3 ph\u00e1t audio.'
                                            }
                                        </audio>
                                    </div>
                                ) : microphone === 'CHECKING' ? (
                                    <p className="mt-2 text-xs font-semibold text-violet-600">
                                        {
                                            'H\u00e3y n\u00f3i m\u1ed9t c\u00e2u ng\u1eafn trong 3 gi\u00e2y\u2026'
                                        }
                                    </p>
                                ) : null
                            }
                        />
                        <DeviceCheck
                            icon={Headphones}
                            title="Nhận dạng giọng nói"
                            description={
                                heardText
                                    ? `Đã nghe: “${heardText}”`
                                    : 'Nói một câu ngắn để kiểm tra chuyển giọng nói thành văn bản.'
                            }
                            state={speechInput}
                            action="Bắt đầu nói"
                            onCheck={checkSpeechInput}
                        />
                        <DeviceCheck
                            icon={Volume2}
                            title="Giọng người phỏng vấn"
                            description="Phát một câu mẫu bằng loa hoặc tai nghe hiện tại."
                            state={speechOutput}
                            action="Phát thử"
                            onCheck={checkSpeechOutput}
                        />
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:justify-end sm:p-7">
                        <Button
                            variant="outline"
                            className="rounded-lg font-bold"
                            disabled={startInterview.isPending}
                            onClick={() => void enterRoom('TEXT')}
                        >
                            <MicOff className="size-4" /> Dùng văn bản
                        </Button>
                        <Button
                            className="rounded-lg font-bold"
                            disabled={!voiceReady || startInterview.isPending}
                            onClick={() => void enterRoom('VOICE')}
                        >
                            {startInterview.isPending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Mic className="size-4" />
                            )}
                            Vào phòng bằng giọng nói
                        </Button>
                    </div>
                </section>

                <aside className="h-fit rounded-2xl border border-violet-100 bg-violet-50/55 p-6">
                    <span className="bg-primary/10 text-primary grid size-12 place-items-center rounded-xl">
                        <ShieldCheck className="size-6" />
                    </span>
                    <h2 className="mt-4 text-lg font-extrabold text-slate-950">
                        Quyền riêng tư
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Audio kiểm tra và audio trả lời không được lưu vĩnh
                        viễn. Chỉ phần văn bản bạn xác nhận mới được gửi vào
                        runtime phỏng vấn hiện tại.
                    </p>
                    <div className="mt-5 rounded-xl border border-violet-100 bg-white/80 p-4 text-sm leading-6 text-slate-600">
                        Nếu trình duyệt không hỗ trợ hoặc thiết bị gặp lỗi, chế
                        độ văn bản vẫn hoạt động đầy đủ và không làm mất tiến
                        trình.
                    </div>
                </aside>
            </div>
        </main>
    );
}

function DeviceCheck({
    icon: Icon,
    title,
    description,
    state,
    action,
    onCheck,
    extra,
}: {
    icon: typeof Mic;
    title: string;
    description: string;
    state: CheckState;
    action: string;
    onCheck: () => void;
    extra?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
            <span
                className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-xl',
                    state === 'PASS'
                        ? 'bg-emerald-50 text-emerald-600'
                        : state === 'FAIL'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-violet-50 text-violet-600',
                )}
            >
                <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                    {description}
                </p>
                {extra}
            </div>
            <div className="flex items-center gap-3">
                <CheckIndicator state={state} />
                <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg font-bold"
                    disabled={state === 'CHECKING'}
                    onClick={onCheck}
                >
                    {state === 'CHECKING' ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <Play className="size-4" />
                    )}
                    {action}
                </Button>
            </div>
        </div>
    );
}

function CheckIndicator({ state }: { state: CheckState }) {
    if (state === 'PASS')
        return (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="size-4" /> Sẵn sàng
            </span>
        );
    if (state === 'FAIL')
        return (
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <CircleAlert className="size-4" /> Chưa đạt
            </span>
        );
    return null;
}

function SetupSkeleton() {
    return (
        <main className="mx-auto w-full max-w-[1600px] animate-pulse px-4 py-6 sm:px-6 lg:px-8">
            <div className="h-5 w-52 rounded bg-slate-200" />
            <div className="mt-7 h-24 max-w-2xl rounded-xl bg-slate-200" />
            <div className="mt-7 h-[480px] rounded-2xl bg-slate-100" />
        </main>
    );
}
