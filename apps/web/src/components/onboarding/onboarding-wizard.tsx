'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Lightbulb,
    Loader2,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';
import { ErrorState } from '@/components/common/error-state';
import { useOnboarding } from '@/hooks/onboarding/use-onboarding';
import { useMe } from '@/hooks/auth/use-me';
import {
    useCompleteOnboarding,
    useSkipOnboarding,
} from '@/hooks/onboarding/use-onboarding-mutations';
import {
    onboardingSchema,
    type OnboardingFormValues,
} from '@/schemas/onboarding.schema';
import type {
    CompleteOnboardingRequest,
    ContentPreference,
    InterviewGoal,
} from '@/services/onboarding.service';
import { cn } from '@/lib/utils';
import { experienceOptions, targetRoles } from './onboarding-options';
import {
    ExperienceStep,
    GoalsStep,
    PersonalInformationStep,
    PreferencesStep,
    ReviewStep,
    TargetRoleStep,
} from './onboarding-steps';

const steps = [
    { title: 'Chào mừng', subtitle: 'Hãy để chúng tôi hiểu bạn' },
    {
        title: 'Vị trí mục tiêu',
        subtitle: 'Bạn đang chuẩn bị cho vai trò nào?',
    },
    { title: 'Kinh nghiệm', subtitle: 'Cấp độ hiện tại của bạn' },
    { title: 'Mục tiêu', subtitle: 'Bạn muốn đạt được điều gì?' },
    { title: 'Tùy chọn', subtitle: 'Sở thích học tập của bạn' },
    { title: 'Hoàn tất', subtitle: 'Mọi thứ đã sẵn sàng!' },
] as const;

const stepDescriptions = [
    'Cùng hoàn thiện hồ sơ để Interviewly thiết kế hành trình luyện phỏng vấn dành riêng cho bạn.',
    'Hãy chọn vai trò bạn đang chuẩn bị ứng tuyển để chúng tôi cá nhân hóa trải nghiệm luyện phỏng vấn.',
    'Thông tin này giúp chúng tôi điều chỉnh độ khó và nội dung phù hợp với năng lực hiện tại của bạn.',
    'Chọn tất cả mục tiêu phù hợp với bạn. Bạn luôn có thể cập nhật lại sau.',
    'Hãy chọn sở thích học tập để mỗi buổi luyện tập phù hợp và hiệu quả hơn với bạn.',
    'Xem lại thông tin bên dưới. Bạn luôn có thể thay đổi chúng trong phần cài đặt tài khoản.',
] as const;

const stepHeadings = [
    'Chào mừng đến Interviewly!',
    'Bạn đang hướng đến vị trí nào?',
    'Bạn đang ở cấp độ kinh nghiệm nào?',
    'Bạn muốn đạt được điều gì?',
    'Bạn muốn luyện tập theo cách nào?',
    'Mọi thứ đã sẵn sàng!',
] as const;

const sidebarTips = [
    {
        title: 'Cá nhân hóa trải nghiệm',
        description:
            'Thông tin này giúp chúng tôi đề xuất nội dung phù hợp nhất cho bạn.',
    },
    {
        title: 'Chọn đúng vai trò',
        description:
            'Vai trò mục tiêu giúp câu hỏi luyện tập sát hơn với công việc bạn mong muốn.',
    },
    {
        title: 'Vì sao điều này quan trọng?',
        description:
            'Chúng tôi sẽ điều chỉnh độ khó và lộ trình dựa trên kinh nghiệm của bạn.',
    },
    {
        title: 'Vì sao cần đặt mục tiêu?',
        description:
            'Mục tiêu giúp cá nhân hóa kế hoạch luyện tập và đề xuất nội dung thiết thực nhất.',
    },
    {
        title: 'Học theo cách của bạn',
        description:
            'Các tùy chọn giúp mỗi buổi luyện tập phù hợp hơn với thói quen của bạn.',
    },
    {
        title: 'Sẵn sàng bắt đầu',
        description:
            'Bạn vẫn có thể cập nhật toàn bộ thông tin này trong phần cài đặt.',
    },
] as const;

const stepFields: Array<Array<keyof OnboardingFormValues>> = [
    ['fullName', 'avatarUrl'],
    ['targetRole'],
    ['experienceLevel', 'yearsOfExperience'],
    ['interviewGoals', 'customInterviewGoal'],
    [
        'learningStyle',
        'contentPreferences',
        'sessionLength',
        'defaultDifficulty',
        'feedbackDetail',
    ],
    [],
];

const DICEBEAR_SEEDS = [
    'interviewly-amber',
    'interviewly-bolt',
    'interviewly-cobalt',
    'interviewly-delta',
    'interviewly-echo',
    'interviewly-flux',
    'interviewly-glow',
    'interviewly-helix',
    'interviewly-ion',
    'interviewly-jade',
    'interviewly-kite',
    'interviewly-luna',
] as const;

const diceBearAvatarUrl = (seed: string) =>
    `https://api.dicebear.com/10.x/voxel-bot/svg?seed=${encodeURIComponent(seed)}`;

const DICEBEAR_AVATARS = DICEBEAR_SEEDS.map(diceBearAvatarUrl);
const ONBOARDING_DRAFT_PREFIX = 'interviewly:onboarding-draft';

interface OnboardingDraft {
    currentStep: number;
    values: Partial<OnboardingFormValues>;
}

const getDraftKey = (userId: string) => `${ONBOARDING_DRAFT_PREFIX}:${userId}`;

function getDefaultAvatar(userId: string) {
    const hash = Array.from(userId).reduce(
        (value, character) => value + character.charCodeAt(0),
        0,
    );

    return DICEBEAR_AVATARS[hash % DICEBEAR_AVATARS.length];
}

export function OnboardingWizard() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [usesCustomRole, setUsesCustomRole] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFileError, setAvatarFileError] = useState<string | null>(null);
    const [isDraftReady, setIsDraftReady] = useState(false);
    const hasInitialized = useRef(false);
    const shouldPersistDraft = useRef(true);
    const meQuery = useMe();
    const onboardingQuery = useOnboarding(meQuery.data?.id);
    const completeMutation = useCompleteOnboarding();
    const skipMutation = useSkipOnboarding();

    const {
        register,
        reset,
        control,
        setValue,
        trigger,
        handleSubmit,
        formState: { errors },
    } = useForm<OnboardingFormValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            fullName: '',
            avatarUrl: '',
            targetRole: '',
            yearsOfExperience: undefined,
            interviewGoals: [],
            customInterviewGoal: '',
            contentPreferences: [],
            sessionLength: 30,
            defaultDifficulty: 'MEDIUM',
            feedbackDetail: 'STANDARD',
        },
    });

    useEffect(() => {
        if (!onboardingQuery.data || hasInitialized.current) return;

        const data = onboardingQuery.data.data;
        const preferences = data.preferences;
        const currentTargetRole = preferences?.targetRole ?? '';
        const userId = meQuery.data?.id ?? 'guest';
        let draft: OnboardingDraft | null = null;

        try {
            const savedDraft = localStorage.getItem(getDraftKey(userId));
            draft = savedDraft
                ? (JSON.parse(savedDraft) as OnboardingDraft)
                : null;
        } catch {
            localStorage.removeItem(getDraftKey(userId));
        }

        const avatarUrl =
            draft?.values.avatarUrl ||
            data.avatarUrl ||
            getDefaultAvatar(userId);
        const restoredValues = {
            fullName: data.fullName,
            targetRole: currentTargetRole,
            experienceLevel: preferences?.experienceLevel ?? undefined,
            yearsOfExperience: preferences?.yearsOfExperience ?? undefined,
            interviewGoals: preferences?.interviewGoals ?? [],
            customInterviewGoal: preferences?.customInterviewGoal ?? '',
            learningStyle: preferences?.learningStyle ?? undefined,
            contentPreferences: preferences?.contentPreferences ?? [],
            sessionLength: preferences?.sessionLength ?? 30,
            defaultDifficulty: preferences?.defaultDifficulty ?? 'MEDIUM',
            feedbackDetail: preferences?.feedbackDetail ?? 'STANDARD',
            ...draft?.values,
            avatarUrl,
        } as OnboardingFormValues;

        setAvatarPreview(avatarUrl);
        reset(restoredValues);
        const restoredStep = Number.isInteger(draft?.currentStep)
            ? draft!.currentStep
            : 0;
        setCurrentStep(Math.min(Math.max(restoredStep, 0), steps.length - 1));
        setUsesCustomRole(
            restoredValues.targetRole !== '' &&
                !targetRoles.includes(
                    restoredValues.targetRole as (typeof targetRoles)[number],
                ),
        );
        hasInitialized.current = true;
        setIsDraftReady(true);
    }, [meQuery.data?.id, onboardingQuery.data, reset]);

    const values = useWatch({ control }) as OnboardingFormValues;
    const isSubmitting = completeMutation.isPending || skipMutation.isPending;

    useEffect(() => {
        const userId = meQuery.data?.id;
        if (!userId || !isDraftReady || !shouldPersistDraft.current) return;

        const draft: OnboardingDraft = { currentStep, values };
        try {
            localStorage.setItem(getDraftKey(userId), JSON.stringify(draft));
        } catch {
            // Không làm gián đoạn onboarding nếu trình duyệt chặn storage.
        }
    }, [currentStep, isDraftReady, meQuery.data?.id, values]);

    const clearDraft = () => {
        shouldPersistDraft.current = false;
        const userId = meQuery.data?.id;
        if (userId) localStorage.removeItem(getDraftKey(userId));
    };

    const handleAvatarFile = (file: File) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setAvatarFileError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setAvatarFileError('Ảnh không được vượt quá 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setAvatarPreview(reader.result);
                setAvatarFileError(null);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarSelect = (avatarUrl: string) => {
        setAvatarPreview(avatarUrl);
        setAvatarFileError(null);
        setValue('avatarUrl', avatarUrl, {
            shouldDirty: true,
            shouldValidate: true,
        });
    };

    const goNext = async () => {
        const isValid = await trigger(stepFields[currentStep], {
            shouldFocus: true,
        });

        if (isValid) {
            setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
        }
    };

    const toggleGoal = (goal: InterviewGoal) => {
        const next = values.interviewGoals.includes(goal)
            ? values.interviewGoals.filter((item) => item !== goal)
            : [...values.interviewGoals, goal];

        setValue('interviewGoals', next, {
            shouldDirty: true,
            shouldValidate: true,
        });

        if (goal === 'OTHER' && !next.includes('OTHER')) {
            setValue('customInterviewGoal', '');
        }
    };

    const toggleContent = (content: ContentPreference) => {
        const next = values.contentPreferences.includes(content)
            ? values.contentPreferences.filter((item) => item !== content)
            : [...values.contentPreferences, content];

        setValue('contentPreferences', next, {
            shouldDirty: true,
            shouldValidate: true,
        });
    };

    // handleSubmit invokes this callback from a form event, never during render.
    // eslint-disable-next-line react-hooks/refs
    const submitOnboarding = handleSubmit(async (formValues) => {
        const payload: CompleteOnboardingRequest = {
            ...formValues,
            avatarUrl: formValues.avatarUrl || undefined,
            customInterviewGoal: formValues.interviewGoals.includes('OTHER')
                ? formValues.customInterviewGoal?.trim()
                : undefined,
        };

        try {
            await completeMutation.mutateAsync(payload);
            clearDraft();
            router.replace('/dashboard');
            toast.success('Bạn đã hoàn tất onboarding', {
                id: 'onboarding-complete',
            });
        } catch (error) {
            showMutationError(
                error,
                'Không thể hoàn tất onboarding. Vui lòng thử lại.',
            );
        }
    });

    const handleSkip = async () => {
        try {
            await skipMutation.mutateAsync();
            clearDraft();
            router.replace('/dashboard');
            toast.success('Bạn có thể cập nhật tùy chọn sau trong cài đặt', {
                id: 'onboarding-skip',
            });
        } catch (error) {
            showMutationError(
                error,
                'Không thể bỏ qua onboarding. Vui lòng thử lại.',
            );
        }
    };

    if (onboardingQuery.isPending) {
        return <OnboardingSkeleton />;
    }

    if (onboardingQuery.isError) {
        return (
            <main className="flex min-h-[100dvh] items-center justify-center p-6">
                <ErrorState
                    title="Không thể tải onboarding"
                    description="Vui lòng kiểm tra kết nối và thử lại."
                    onRetry={() => void onboardingQuery.refetch()}
                />
            </main>
        );
    }

    return (
        <main className="grid min-h-[100dvh] bg-[#fbfbfe] lg:grid-cols-[334px_minmax(0,1fr)]">
            <OnboardingSidebar currentStep={currentStep} values={values} />

            <div className="min-w-0">
                <header className="flex h-16 items-center justify-between border-b border-violet-100 bg-white/75 px-5 backdrop-blur sm:px-8 lg:justify-end lg:border-0 xl:px-14">
                    <Logo
                        variant="default"
                        width={142}
                        height={36}
                        className="lg:hidden"
                    />
                    <div className="flex items-center gap-5">
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-primary hover:text-secondary-foreground mt-1 hidden text-[15px] font-bold transition-colors hover:bg-transparent lg:block"
                            disabled={isSubmitting}
                            onClick={() => void handleSkip()}
                        >
                            Bỏ qua lúc này
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-primary hover:text-secondary-foreground mt-1 text-[15px] font-bold transition-colors hover:bg-transparent lg:hidden"
                            disabled={isSubmitting}
                            onClick={() => void handleSkip()}
                        >
                            Bỏ qua
                        </Button>
                        <span
                            aria-hidden="true"
                            className="hidden h-7 w-px bg-slate-200 sm:block"
                        />
                        <UserSummary
                            fullName={values.fullName}
                            avatarUrl={avatarPreview}
                        />
                    </div>
                </header>

                <div className="mx-auto w-full max-w-[1600px] px-5 py-4 sm:px-8 lg:py-5 xl:px-14">
                    <div className="mb-5">
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                            {stepHeadings[currentStep]}{' '}
                            {currentStep === 0 && (
                                <span aria-hidden="true">👋</span>
                            )}
                            {currentStep === steps.length - 1 && (
                                <span aria-hidden="true">🎉</span>
                            )}
                        </h1>
                        <p className="text-muted-foreground mt-3 text-base font-semibold">
                            {stepDescriptions[currentStep]}
                        </p>
                    </div>

                    <section className="rounded-md border border-slate-100 bg-white p-5 shadow-[0_18px_50px_rgba(62,45,116,0.06)] sm:p-6">
                        <form onSubmit={(event) => event.preventDefault()}>
                            {currentStep === 0 && (
                                <PersonalInformationStep
                                    register={register}
                                    errors={errors}
                                    fullName={values.fullName}
                                    avatarPreview={avatarPreview}
                                    avatarOptions={DICEBEAR_AVATARS}
                                    avatarFileError={avatarFileError}
                                    onAvatarFile={handleAvatarFile}
                                    onAvatarSelect={handleAvatarSelect}
                                />
                            )}
                            {currentStep === 1 && (
                                <TargetRoleStep
                                    value={values.targetRole}
                                    usesCustomRole={usesCustomRole}
                                    error={errors.targetRole?.message}
                                    register={register}
                                    onSelect={(role) => {
                                        setUsesCustomRole(false);
                                        setValue('targetRole', role, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        });
                                    }}
                                    onSelectCustom={() => {
                                        setUsesCustomRole(true);
                                        setValue('targetRole', '', {
                                            shouldDirty: true,
                                        });
                                    }}
                                />
                            )}
                            {currentStep === 2 && (
                                <ExperienceStep
                                    values={values}
                                    errors={errors}
                                    setValue={setValue}
                                />
                            )}
                            {currentStep === 3 && (
                                <GoalsStep
                                    values={values}
                                    errors={errors}
                                    register={register}
                                    onToggle={toggleGoal}
                                />
                            )}
                            {currentStep === 4 && (
                                <PreferencesStep
                                    values={values}
                                    errors={errors}
                                    setValue={setValue}
                                    onToggleContent={toggleContent}
                                />
                            )}
                            {currentStep === 5 && (
                                <ReviewStep
                                    values={values}
                                    onEdit={() => setCurrentStep(0)}
                                />
                            )}

                            {currentStep === 0 && (
                                <div className="mt-5 border-t border-slate-200 pt-4">
                                    <div className="flex gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                                        <ShieldCheck className="text-primary mt-0.5 size-6 shrink-0 stroke-2" />
                                        <div>
                                            <p className="text-primary font-bold">
                                                Quyền riêng tư của bạn rất quan
                                                trọng
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600">
                                                Bạn luôn có thể thay đổi thông
                                                tin này trong phần cài đặt tài
                                                khoản.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-5 text-sm text-slate-600">
                                    {currentStep > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={isSubmitting}
                                            onClick={() =>
                                                setCurrentStep((step) =>
                                                    Math.max(0, step - 1),
                                                )
                                            }
                                            className="h-10 !rounded-sm font-bold"
                                        >
                                            <ArrowLeft />
                                            Quay lại
                                        </Button>
                                    )}
                                    <span className="font-bold whitespace-nowrap">
                                        Bước {currentStep + 1} trên{' '}
                                        {steps.length}
                                    </span>
                                    <div
                                        className="flex w-40 gap-1.5 sm:w-56"
                                        role="progressbar"
                                        aria-valuemin={1}
                                        aria-valuemax={steps.length}
                                        aria-valuenow={currentStep + 1}
                                        aria-label={`Bước ${currentStep + 1} trên ${steps.length}`}
                                    >
                                        {steps.map((step, index) => (
                                            <span
                                                key={step.title}
                                                className={cn(
                                                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                                                    index <= currentStep
                                                        ? 'bg-primary'
                                                        : 'bg-slate-200',
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    {currentStep < steps.length - 1 ? (
                                        <Button
                                            type="button"
                                            className="h-10 min-w-40 !rounded-sm font-bold"
                                            disabled={isSubmitting}
                                            onClick={() => void goNext()}
                                        >
                                            Tiếp tục
                                            <ArrowRight />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() =>
                                                void submitOnboarding()
                                            }
                                            className="h-10 min-w-40 !rounded-sm font-bold"
                                        >
                                            {completeMutation.isPending ? (
                                                <Loader2 className="mr-1 animate-spin" />
                                            ) : (
                                                <Sparkles className="mr-1" />
                                            )}
                                            Bắt đầu hành trình
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </main>
    );
}

function OnboardingSidebar({
    currentStep,
    values,
}: {
    currentStep: number;
    values: OnboardingFormValues;
}) {
    const tip = sidebarTips[currentStep];
    const experienceLabel = experienceOptions.find(
        ([key]) => key === values.experienceLevel,
    )?.[1];

    const getStepSubtitle = (index: number) => {
        if (index >= currentStep) return steps[index].subtitle;

        if (index === 1) return values.targetRole || steps[index].subtitle;
        if (index === 2) return experienceLabel || steps[index].subtitle;
        if (index === 3) {
            return `Đã chọn ${values.interviewGoals.length} mục tiêu`;
        }
        if (index === 4) return 'Tùy chọn học tập của bạn';

        return steps[index].subtitle;
    };

    return (
        <aside className="sticky top-0 hidden h-[100dvh] flex-col overflow-y-auto border-r border-violet-100 bg-[radial-gradient(circle_at_10%_15%,rgba(111,75,246,0.13),transparent_34%),linear-gradient(180deg,#fbfaff_0%,#f7f5ff_100%)] px-7 py-7 lg:flex">
            <Logo variant="default" width={200} height={42} />
            <p className="text-primary mt-12 font-bold">Onboarding</p>
            <ol className="mt-6 flex-1">
                {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;

                    return (
                        <li
                            key={step.title}
                            className="relative flex min-h-24 gap-4"
                        >
                            {index < steps.length - 1 && (
                                <span
                                    className={cn(
                                        'absolute top-9 left-[17px] h-[calc(100%-1rem)] w-[2px]',
                                        isComplete
                                            ? 'bg-primary/50'
                                            : 'bg-slate-300',
                                    )}
                                />
                            )}
                            <span
                                className={cn(
                                    'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border bg-white text-sm font-extrabold',
                                    isActive &&
                                        'border-primary bg-primary text-white shadow-[0_4px_14px_rgba(111,75,246,0.35)]',
                                    isComplete &&
                                        'border-primary bg-primary text-white',
                                    !isActive &&
                                        !isComplete &&
                                        'border-slate-300 text-slate-700',
                                )}
                            >
                                {isComplete ? (
                                    <Check className="size-4 stroke-3" />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <div className="pt-0.5">
                                <p
                                    className={cn(
                                        'font-bold text-slate-900',
                                        isActive && 'text-primary',
                                    )}
                                >
                                    {step.title}
                                </p>
                                <p
                                    className={cn(
                                        'text-muted-foreground mt-1 text-sm leading-5 font-semibold',
                                        isActive && 'text-primary',
                                    )}
                                >
                                    {getStepSubtitle(index)}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ol>
            <div className="flex gap-3 rounded-xl border border-violet-200 bg-white/50 p-4 text-sm leading-6 text-slate-600">
                <Lightbulb className="text-primary mt-0.5 size-6 shrink-0" />
                <div>
                    <p className="font-bold text-slate-800">{tip.title}</p>
                    <p className="mt-1">{tip.description}</p>
                </div>
            </div>
        </aside>
    );
}

function UserSummary({
    fullName,
    avatarUrl,
}: {
    fullName?: string;
    avatarUrl: string | null;
}) {
    const displayName = fullName?.trim() || 'Tài khoản của bạn';
    const initials = displayName
        .split(/\s+/)
        .slice(-2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    return (
        <div className="hidden items-center gap-3 sm:flex">
            <div
                className="text-primary flex size-11 items-center justify-center rounded-full bg-violet-100 bg-cover bg-center text-sm font-bold"
                style={
                    avatarUrl
                        ? { backgroundImage: `url(${avatarUrl})` }
                        : undefined
                }
                aria-hidden="true"
            >
                {!avatarUrl && initials}
            </div>
            <span className="mt-1 max-w-40 truncate font-bold text-slate-900">
                {displayName}
            </span>
        </div>
    );
}

function OnboardingSkeleton() {
    return (
        <main className="flex min-h-[100dvh] items-center justify-center">
            <div className="w-full max-w-md space-y-4 px-6">
                <div className="bg-muted mx-auto h-8 w-40 animate-pulse rounded-lg" />
                <div className="bg-muted h-3 w-full animate-pulse rounded" />
                <div className="bg-muted h-40 w-full animate-pulse rounded-2xl" />
            </div>
        </main>
    );
}

function showMutationError(error: unknown, fallback: string) {
    const message = axios.isAxiosError<ApiErrorResponse>(error)
        ? error.response?.data?.error?.message
        : undefined;
    const description =
        typeof message === 'string'
            ? message
            : Array.isArray(message)
              ? message.join('. ')
              : fallback;

    toast.error('Đã xảy ra lỗi', {
        description,
    });
}

interface ApiErrorResponse {
    error?: {
        message?: string | string[];
    };
}
