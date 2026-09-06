import type {
    FieldErrors,
    UseFormRegister,
    UseFormSetValue,
} from 'react-hook-form';
import {
    BrainCircuit,
    BookOpen,
    Braces,
    ChartNoAxesCombined,
    Check,
    Clock3,
    Database,
    Ellipsis,
    FileText,
    GraduationCap,
    Headphones,
    Info,
    Layers3,
    MessageCircle,
    MonitorPlay,
    Pencil,
    Rocket,
    Server,
    Sparkles,
    Sprout,
    Star,
    SlidersHorizontal,
    Target,
    TrendingUp,
    Trophy,
    Upload,
    Users,
    UserRound,
    Eye,
} from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OnboardingFormValues } from '@/schemas/onboarding.schema';
import type {
    ContentPreference,
    InterviewGoal,
} from '@/services/onboarding.service';
import { Field, ReviewItem, ReviewSection } from './onboarding-fields';
import {
    contentOptions,
    experienceOptions,
    goalOptions,
    learningStyleOptions,
    targetRoles,
} from './onboarding-options';

type Register = UseFormRegister<OnboardingFormValues>;
type SetValue = UseFormSetValue<OnboardingFormValues>;
type Errors = FieldErrors<OnboardingFormValues>;

const targetRoleCards = [
    {
        role: targetRoles[0],
        description:
            'HTML, CSS, JavaScript, React và các framework frontend hiện đại',
        icon: Braces,
        iconClassName: 'bg-violet-100 text-violet-600',
        popular: true,
    },
    {
        role: targetRoles[1],
        description:
            'Node.js, Python, Java, cơ sở dữ liệu và phát triển phía máy chủ',
        icon: Server,
        iconClassName: 'bg-emerald-100 text-emerald-600',
    },
    {
        role: targetRoles[2],
        description: 'Phát triển sản phẩm toàn diện với cả frontend và backend',
        icon: Layers3,
        iconClassName: 'bg-amber-100 text-amber-600',
    },
    {
        role: targetRoles[3],
        description: 'Data pipeline, ETL, cơ sở dữ liệu và hạ tầng dữ liệu',
        icon: Database,
        iconClassName: 'bg-sky-100 text-sky-600',
    },
    {
        role: targetRoles[4],
        description: 'Mô hình ML, Python, AI framework và khoa học dữ liệu',
        icon: BrainCircuit,
        iconClassName: 'bg-rose-100 text-rose-500',
    },
] as const;

const experienceCards = [
    {
        key: experienceOptions[0][0],
        title: experienceOptions[0][1],
        description:
            'Tôi đang thực tập hoặc mới chỉ có kinh nghiệm thực hành ở mức cơ bản.',
        example: 'Đang thực hiện các dự án sinh viên',
        icon: GraduationCap,
        iconClassName: 'bg-emerald-100 text-emerald-600',
        badgeClassName: 'bg-emerald-100 text-emerald-700',
    },
    {
        key: experienceOptions[1][0],
        title: experienceOptions[1][1],
        description:
            'Tôi mới bước vào ngành, có kiến thức lý thuyết nhưng chưa có nhiều kinh nghiệm thực tế.',
        example: 'Mới tốt nghiệp, ít hoặc chưa có kinh nghiệm',
        icon: Sprout,
        iconClassName: 'bg-violet-100 text-violet-600',
        badgeClassName: 'bg-violet-100 text-violet-700',
    },
    {
        key: experienceOptions[2][0],
        title: experienceOptions[2][1],
        description:
            'Tôi đã có kinh nghiệm thực tế và có thể hoàn thành các nhiệm vụ cơ bản khi được hướng dẫn.',
        example: '1–2 năm kinh nghiệm',
        icon: UserRound,
        iconClassName: 'bg-sky-100 text-sky-600',
        badgeClassName: 'bg-sky-100 text-sky-700',
    },
    {
        key: experienceOptions[3][0],
        title: experienceOptions[3][1],
        description:
            'Tôi có thể làm việc độc lập với phần lớn nhiệm vụ và xử lý những thử thách ở mức độ vừa phải.',
        example: '3–5 năm kinh nghiệm',
        icon: ChartNoAxesCombined,
        iconClassName: 'bg-amber-100 text-amber-600',
        badgeClassName: 'bg-amber-100 text-amber-700',
    },
    {
        key: experienceOptions[4][0],
        title: experienceOptions[4][1],
        description:
            'Tôi có nhiều kinh nghiệm, tự tin xử lý các nhiệm vụ phức tạp và có thể hướng dẫn người khác.',
        example: 'Trên 5 năm kinh nghiệm',
        icon: Star,
        iconClassName: 'bg-rose-100 text-rose-500',
        badgeClassName: 'bg-rose-100 text-rose-600',
    },
    {
        key: experienceOptions[5][0],
        title: experienceOptions[5][1],
        description:
            'Tôi có nền tảng kỹ thuật vững vàng, kỹ năng lãnh đạo và có thể dẫn dắt dự án hoặc đội nhóm.',
        example: 'Dẫn dắt dự án hoặc đội nhóm',
        icon: Users,
        iconClassName: 'bg-blue-100 text-blue-600',
        badgeClassName: 'bg-blue-100 text-blue-700',
    },
] as const;

const goalCards = [
    {
        key: goalOptions[0][0],
        title: goalOptions[0][1],
        description:
            'Chuẩn bị thật tốt cho buổi phỏng vấn và chinh phục công việc mơ ước.',
        icon: Target,
        iconClassName: 'bg-violet-100 text-violet-600',
    },
    {
        key: goalOptions[1][0],
        title: goalOptions[1][1],
        description: 'Nâng cao tư duy kỹ thuật và khả năng giải quyết vấn đề.',
        icon: TrendingUp,
        iconClassName: 'bg-emerald-100 text-emerald-600',
    },
    {
        key: goalOptions[2][0],
        title: goalOptions[2][1],
        description: 'Sẵn sàng ứng tuyển vào các công ty công nghệ hàng đầu.',
        icon: Trophy,
        iconClassName: 'bg-amber-100 text-amber-600',
    },
    {
        key: goalOptions[3][0],
        title: goalOptions[3][1],
        description: 'Tự tin chuyển sang một vai trò hoặc lĩnh vực mới.',
        icon: Braces,
        iconClassName: 'bg-sky-100 text-sky-600',
    },
    {
        key: goalOptions[4][0],
        title: goalOptions[4][1],
        description:
            'Giảm áp lực và thể hiện bản thân tự tin hơn trong phỏng vấn.',
        icon: Rocket,
        iconClassName: 'bg-rose-100 text-rose-500',
    },
    {
        key: goalOptions[5][0],
        title: goalOptions[5][1],
        description: 'Nhận góp ý để hoàn thiện CV và làm nổi bật năng lực.',
        icon: FileText,
        iconClassName: 'bg-violet-100 text-violet-600',
    },
    {
        key: goalOptions[6][0],
        title: goalOptions[6][1],
        description:
            'Rèn luyện khả năng trình bày, giao tiếp và các kỹ năng mềm.',
        icon: MessageCircle,
        iconClassName: 'bg-cyan-100 text-cyan-600',
    },
    {
        key: goalOptions[7][0],
        title: goalOptions[7][1],
        description: 'Một mục tiêu khác chưa có trong danh sách.',
        icon: Ellipsis,
        iconClassName: 'bg-slate-100 text-slate-500',
    },
] as const;

const learningStyleCards = [
    {
        key: learningStyleOptions[0][0],
        title: learningStyleOptions[0][1],
        description:
            'Luyện tập với bài tập thực tế và các buổi phỏng vấn mô phỏng.',
        icon: MonitorPlay,
        iconClassName: 'bg-violet-100 text-violet-600',
    },
    {
        key: learningStyleOptions[1][0],
        title: learningStyleOptions[1][1],
        description:
            'Đọc kỹ phần giải thích, hướng dẫn và tài liệu chuyên môn.',
        icon: BookOpen,
        iconClassName: 'bg-emerald-100 text-emerald-600',
    },
    {
        key: learningStyleOptions[2][0],
        title: learningStyleOptions[2][1],
        description:
            'Tiếp thu kiến thức qua video và nội dung minh họa trực quan.',
        icon: Eye,
        iconClassName: 'bg-amber-100 text-amber-600',
    },
    {
        key: learningStyleOptions[3][0],
        title: learningStyleOptions[3][1],
        description: 'Linh hoạt kết hợp nhiều phương pháp học tập khác nhau.',
        icon: Headphones,
        iconClassName: 'bg-sky-100 text-sky-600',
    },
] as const;

export function PersonalInformationStep({
    register,
    errors,
    fullName,
    avatarPreview,
    avatarOptions,
    avatarFileError,
    onAvatarFile,
    onAvatarSelect,
}: {
    register: Register;
    errors: Errors;
    fullName: string;
    avatarPreview: string | null;
    avatarOptions: readonly string[];
    avatarFileError: string | null;
    onAvatarFile: (file: File) => void;
    onAvatarSelect: (avatarUrl: string) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initials = fullName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) onAvatarFile(file);
        event.target.value = '';
    };

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-extrabold">
                    Chúng tôi nên gọi bạn là gì?
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Tên này sẽ hiển thị trên tài khoản của bạn.
                </p>
            </div>

            <div className="max-w-2xl">
                <Field label="Họ và tên" error={errors.fullName?.message}>
                    <div className="relative">
                        <UserRound className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
                        <Input
                            className="mt-2 h-12 pl-12 text-[15px]"
                            placeholder="Nhập họ và tên của bạn"
                            aria-invalid={Boolean(errors.fullName)}
                            {...register('fullName')}
                        />
                    </div>
                </Field>
            </div>

            <div className="space-y-3">
                <div>
                    <p className="text-sm font-bold">
                        Ảnh đại diện{' '}
                        <span className="text-muted-foreground font-normal">
                            (không bắt buộc)
                        </span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Thêm ảnh để cá nhân hóa hồ sơ của bạn.
                    </p>
                </div>

                <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.25fr)]">
                    <div className="flex min-w-0 flex-col items-center justify-center gap-4 text-center">
                        <div
                            role="img"
                            aria-label="Ảnh đại diện hiện tại"
                            className="bg-primary/10 text-primary relative flex size-32 shrink-0 items-center justify-center rounded-full bg-cover bg-center text-2xl font-extrabold ring-4 ring-violet-100"
                            style={
                                avatarPreview
                                    ? {
                                          backgroundImage: `url("${avatarPreview}")`,
                                      }
                                    : undefined
                            }
                        >
                            {!avatarPreview && (initials || <UserRound />)}
                            <button
                                type="button"
                                aria-label="Chọn ảnh đại diện từ thiết bị"
                                className="bg-primary text-primary-foreground focus-visible:ring-primary absolute right-0 bottom-1 flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Pencil className="size-3.5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-lg"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload />
                                Tải ảnh lên
                            </Button>
                            <p className="text-muted-foreground text-xs">
                                JPG, PNG hoặc WebP. Tối đa 2MB.
                            </p>
                            {avatarFileError && (
                                <p className="text-destructive text-sm">
                                    {avatarFileError}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="min-w-0 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                        <div className="mb-4">
                            <p className="font-semibold text-slate-900">
                                Chọn avatar của bạn
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                Avatar được tạo bởi DiceBear. Bạn có thể thay
                                đổi lại bất cứ lúc nào.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                            {avatarOptions.map((avatarUrl, index) => {
                                const selected = avatarPreview === avatarUrl;

                                return (
                                    <button
                                        key={avatarUrl}
                                        type="button"
                                        className="group focus-visible:ring-primary relative aspect-square overflow-hidden rounded-xl bg-white ring-offset-2 transition outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2"
                                        aria-label={`Chọn avatar ${index + 1}`}
                                        aria-pressed={selected}
                                        onClick={() =>
                                            onAvatarSelect(avatarUrl)
                                        }
                                    >
                                        <span
                                            className="block size-full bg-cover bg-center"
                                            style={{
                                                backgroundImage: `url("${avatarUrl}")`,
                                            }}
                                        />
                                        {selected && (
                                            <span className="bg-primary absolute right-1.5 bottom-1.5 flex size-6 items-center justify-center rounded-full text-white shadow">
                                                <Check className="size-3.5" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TargetRoleStep({
    value,
    usesCustomRole,
    error,
    register,
    onSelect,
    onSelectCustom,
}: {
    value: string;
    usesCustomRole: boolean;
    error?: string;
    register: Register;
    onSelect: (role: string) => void;
    onSelectCustom: () => void;
}) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-extrabold">Chọn vị trí mục tiêu</h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {targetRoleCards.map((item) => {
                    const selected = !usesCustomRole && value === item.role;
                    const RoleIcon = item.icon;

                    return (
                        <button
                            key={item.role}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onSelect(item.role)}
                            className={cn(
                                'hover:border-primary/40 focus-visible:ring-primary relative flex min-h-52 flex-col rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                                selected &&
                                    'border-primary ring-primary bg-violet-50/40 ring-1',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-14 items-center justify-center rounded-xl',
                                    item.iconClassName,
                                )}
                            >
                                <RoleIcon className="size-7" />
                            </span>
                            <span
                                className={cn(
                                    'absolute top-5 right-5 flex size-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white',
                                    selected && '!border-primary',
                                )}
                            >
                                {selected && (
                                    <span className="bg-primary size-2.5 rounded-full" />
                                )}
                            </span>
                            <span
                                className={cn(
                                    'mt-5 block font-extrabold text-slate-950',
                                    selected && 'text-primary',
                                )}
                            >
                                {item.role}
                            </span>
                            <span className="mt-2 block min-h-12 text-sm leading-6 font-semibold text-slate-600">
                                {item.description}
                            </span>
                            <span className="mt-auto flex h-9 items-end">
                                {'popular' in item && item.popular && (
                                    <span className="text-primary inline-flex rounded-full bg-violet-100 px-3 py-2 text-xs font-bold">
                                        Phổ biến nhất
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}

                <div
                    className={cn(
                        'hover:border-primary/40 focus-visible:ring-primary relative min-h-52 rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                        usesCustomRole &&
                            'border-primary ring-primary bg-violet-50/40 ring-1',
                    )}
                >
                    <button
                        type="button"
                        className="focus-visible:ring-primary absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        aria-label="Chọn một vị trí khác"
                        aria-pressed={usesCustomRole}
                        onClick={onSelectCustom}
                    />
                    <div className="pointer-events-none relative">
                        <span className="flex size-14 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                            <Ellipsis className="size-7" />
                        </span>
                        <span
                            className={cn(
                                'absolute top-0 right-0 flex size-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white',
                                usesCustomRole && '!border-primary',
                            )}
                        >
                            {usesCustomRole && (
                                <span className="bg-primary size-2.5 rounded-full" />
                            )}
                        </span>
                        <span
                            className={cn(
                                'mt-5 block font-extrabold text-slate-950',
                                usesCustomRole && 'text-primary',
                            )}
                        >
                            Vị trí khác
                        </span>
                    </div>
                    {usesCustomRole ? (
                        <Input
                            autoFocus
                            className="relative z-10 mt-3 h-10 bg-white"
                            aria-label="Vị trí bạn đang hướng tới"
                            placeholder="Ví dụ: DevOps Engineer"
                            aria-invalid={Boolean(error)}
                            {...register('targetRole')}
                        />
                    ) : (
                        <p className="pointer-events-none relative mt-2 text-sm leading-6 text-slate-600">
                            Product Manager, Designer, QA, DevOps hoặc vai trò
                            khác
                        </p>
                    )}
                    {usesCustomRole && error && (
                        <p className="text-destructive relative z-10 mt-1 text-xs">
                            {error}
                        </p>
                    )}
                </div>
            </div>

            {!usesCustomRole && error && (
                <p className="text-destructive text-sm font-bold">{error}</p>
            )}

            <div className="flex gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <Info className="text-primary mt-0.5 size-6 shrink-0 stroke-2" />
                <div>
                    <p className="text-primary font-bold">
                        Bạn có thể thay đổi sau
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Chưa chắc chắn cũng không sao. Bạn có thể cập nhật vị
                        trí mục tiêu bất cứ lúc nào trong phần cài đặt.
                    </p>
                </div>
            </div>
        </div>
    );
}

export function ExperienceStep({
    values,
    errors,
    setValue,
}: {
    values: OnboardingFormValues;
    errors: Errors;
    setValue: SetValue;
}) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-extrabold">
                Chọn cấp độ hiện tại của bạn
            </h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {experienceCards.map((item) => {
                    const selected = values.experienceLevel === item.key;
                    const ExperienceIcon = item.icon;

                    return (
                        <button
                            key={item.key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                                setValue('experienceLevel', item.key, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                            className={cn(
                                'hover:border-primary/40 focus-visible:ring-primary relative flex min-h-60 flex-col rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                                selected &&
                                    'border-primary ring-primary bg-violet-50/40 ring-1',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-14 items-center justify-center rounded-full',
                                    item.iconClassName,
                                )}
                            >
                                <ExperienceIcon className="size-7" />
                            </span>
                            <span
                                className={cn(
                                    'absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white',
                                    selected && '!border-primary',
                                )}
                            >
                                {selected && (
                                    <span className="bg-primary size-2.5 rounded-full" />
                                )}
                            </span>
                            <span
                                className={cn(
                                    'mt-3 block font-extrabold text-slate-950',
                                    selected && 'text-primary',
                                )}
                            >
                                {item.title}
                            </span>
                            <span className="text-muted-foreground mt-1 block min-h-10 text-sm font-semibold">
                                {item.description}
                            </span>
                            <span className="mt-auto block pt-4">
                                <span className="text-muted-foreground mb-2 block text-sm">
                                    Ví dụ:
                                </span>
                                <span
                                    className={cn(
                                        'inline-flex rounded-full px-3 py-2 text-[13px] font-bold',
                                        item.badgeClassName,
                                    )}
                                >
                                    {item.example}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {errors.experienceLevel && (
                <p className="text-destructive text-sm font-bold">
                    {errors.experienceLevel.message}
                </p>
            )}
        </div>
    );
}

export function GoalsStep({
    values,
    errors,
    register,
    onToggle,
}: {
    values: OnboardingFormValues;
    errors: Errors;
    register: Register;
    onToggle: (goal: InterviewGoal) => void;
}) {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-extrabold">
                    Chọn mục tiêu của bạn
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                    Chúng tôi sẽ điều chỉnh trải nghiệm luyện tập dựa trên những
                    mục tiêu bạn chọn.
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {goalCards.map((item) => {
                    const selected = values.interviewGoals.includes(item.key);
                    const GoalIcon = item.icon;
                    const isOther = item.key === 'OTHER';

                    return (
                        <div
                            key={item.key}
                            className={cn(
                                'group hover:border-primary/50 relative flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(76,55,140,0.09)]',
                                selected &&
                                    'border-primary ring-primary bg-[linear-gradient(145deg,#ffffff_15%,#faf8ff_100%)] shadow-[0_10px_30px_rgba(111,75,246,0.12)] ring-1',
                            )}
                        >
                            <button
                                type="button"
                                className="focus-visible:ring-primary absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                aria-label={item.title}
                                aria-pressed={selected}
                                onClick={() => onToggle(item.key)}
                            />
                            <div className="pointer-events-none relative z-10">
                                <span
                                    className={cn(
                                        'flex size-14 items-center justify-center rounded-2xl',
                                        item.iconClassName,
                                    )}
                                >
                                    <GoalIcon className="size-7 stroke-[2.25]" />
                                </span>
                                <span
                                    className={cn(
                                        'absolute top-0 right-0 flex size-6 items-center justify-center rounded-md border border-slate-300 bg-white text-white shadow-sm transition-all duration-200',
                                        selected
                                            ? 'border-primary bg-primary shadow-[0_4px_12px_rgba(111,75,246,0.3)]'
                                            : 'group-hover:border-primary/50',
                                    )}
                                >
                                    {selected && (
                                        <Check className="size-4 stroke-[3]" />
                                    )}
                                </span>
                                <span
                                    className={cn(
                                        'mt-5 block text-[17px] leading-6 font-extrabold text-slate-950',
                                        selected && 'text-primary',
                                    )}
                                >
                                    {item.title}
                                </span>
                            </div>

                            {isOther && selected ? (
                                <Input
                                    autoFocus
                                    className="relative z-20 mt-3 h-10 bg-white"
                                    aria-label="Mục tiêu khác của bạn"
                                    placeholder="Nhập mục tiêu của bạn"
                                    aria-invalid={Boolean(
                                        errors.customInterviewGoal,
                                    )}
                                    {...register('customInterviewGoal')}
                                />
                            ) : (
                                <p className="pointer-events-none relative z-10 mt-2 text-sm leading-6 text-slate-600">
                                    {item.description}
                                </p>
                            )}

                            {isOther &&
                                selected &&
                                errors.customInterviewGoal && (
                                    <p className="text-destructive relative z-20 mt-1 text-xs">
                                        {errors.customInterviewGoal.message}
                                    </p>
                                )}
                        </div>
                    );
                })}
            </div>

            {errors.interviewGoals && (
                <p className="text-destructive text-sm font-bold">
                    {errors.interviewGoals.message}
                </p>
            )}

            <div className="flex gap-3 rounded-xl border border-violet-100 bg-[linear-gradient(90deg,rgba(245,243,255,0.9),rgba(250,249,255,0.65))] p-4">
                <Sparkles className="text-primary mt-0.5 size-6 shrink-0" />
                <div>
                    <p className="text-primary font-bold">
                        Bạn có thể chọn nhiều mục tiêu
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Dashboard, đề xuất nội dung và lộ trình luyện tập sẽ
                        được cá nhân hóa theo lựa chọn của bạn.
                    </p>
                </div>
            </div>
        </div>
    );
}

export function PreferencesStep({
    values,
    errors,
    setValue,
    onToggleContent,
}: {
    values: OnboardingFormValues;
    errors: Errors;
    setValue: SetValue;
    onToggleContent: (content: ContentPreference) => void;
}) {
    return (
        <div className="space-y-6">
            <section className="space-y-4">
                <div className="flex items-start gap-3">
                    <BookOpen className="text-primary mt-0.5 size-6 shrink-0" />
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-950">
                            Phong cách học tập
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm font-semibold">
                            Bạn muốn tiếp thu kiến thức theo cách nào?
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {learningStyleCards.map((item) => {
                        const selected = values.learningStyle === item.key;
                        const LearningIcon = item.icon;

                        return (
                            <button
                                key={item.key}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                    setValue('learningStyle', item.key, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    })
                                }
                                className={cn(
                                    'group hover:border-primary/50 focus-visible:ring-primary relative min-h-40 rounded-xl border border-slate-200 bg-white p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                                    selected &&
                                        'border-primary ring-primary bg-violet-50/40 ring-1',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-12 items-center justify-center rounded-xl',
                                        item.iconClassName,
                                    )}
                                >
                                    <LearningIcon className="size-6" />
                                </span>
                                <span
                                    className={cn(
                                        'absolute top-4 right-4 flex size-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white',
                                        selected && '!border-primary',
                                    )}
                                >
                                    {selected && (
                                        <span className="bg-primary size-2.5 rounded-full" />
                                    )}
                                </span>
                                <span
                                    className={cn(
                                        'mt-4 block font-extrabold text-slate-950',
                                        selected && 'text-primary',
                                    )}
                                >
                                    {item.title}
                                </span>
                                <span className="text-muted-foreground mt-2 block text-sm leading-5 font-semibold">
                                    {item.description}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {errors.learningStyle && (
                    <p className="text-destructive text-sm font-bold">
                        {errors.learningStyle.message}
                    </p>
                )}
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-5">
                <div className="flex items-start gap-3">
                    <SlidersHorizontal className="text-primary mt-0.5 size-6 shrink-0" />
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-950">
                            Nội dung quan tâm
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm font-semibold">
                            Bạn muốn tập trung luyện tập những nội dung nào?
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {contentOptions.map(([key, label]) => {
                        const selected =
                            values.contentPreferences.includes(key);

                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => onToggleContent(key)}
                                className={cn(
                                    'group hover:border-primary/40 flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800 transition',
                                    selected &&
                                        'border-primary/40 text-primary bg-violet-50/60',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-5 shrink-0 items-center justify-center rounded-sm border border-slate-300 bg-white text-white transition',
                                        selected &&
                                            'border-primary bg-primary shadow-sm',
                                    )}
                                >
                                    {selected && (
                                        <Check className="size-3.5 stroke-[3]" />
                                    )}
                                </span>
                                <span className="">{label}</span>
                            </button>
                        );
                    })}
                </div>
                {errors.contentPreferences && (
                    <p className="text-destructive text-sm font-bold">
                        {errors.contentPreferences.message}
                    </p>
                )}
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-5">
                <div className="flex items-start gap-3">
                    <Clock3 className="text-primary mt-0.5 size-6 shrink-0" />
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-950">
                            Tùy chọn buổi luyện tập
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm font-semibold">
                            Bạn muốn các buổi luyện tập được thiết kế như thế
                            nào?
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                    <Field
                        label="Thời lượng mỗi buổi"
                        error={errors.sessionLength?.message}
                    >
                        <Select
                            value={String(values.sessionLength)}
                            onValueChange={(value) =>
                                setValue('sessionLength', Number(value), {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                        >
                            <SelectTrigger
                                aria-invalid={Boolean(errors.sessionLength)}
                            >
                                <SelectValue placeholder="Chọn thời lượng" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15">15 phút</SelectItem>
                                <SelectItem value="30">30 phút</SelectItem>
                                <SelectItem value="45">45 phút</SelectItem>
                                <SelectItem value="60">60 phút</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field
                        label="Độ khó mặc định"
                        error={errors.defaultDifficulty?.message}
                    >
                        <Select
                            value={values.defaultDifficulty}
                            onValueChange={(value) =>
                                setValue(
                                    'defaultDifficulty',
                                    value as OnboardingFormValues['defaultDifficulty'],
                                    { shouldDirty: true, shouldValidate: true },
                                )
                            }
                        >
                            <SelectTrigger
                                aria-invalid={Boolean(errors.defaultDifficulty)}
                            >
                                <SelectValue placeholder="Chọn độ khó" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EASY">Dễ</SelectItem>
                                <SelectItem value="MEDIUM">
                                    Trung bình
                                </SelectItem>
                                <SelectItem value="HARD">Khó</SelectItem>
                                <SelectItem value="ADAPTIVE">
                                    Thích ứng
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field
                        label="Mức độ phản hồi"
                        error={errors.feedbackDetail?.message}
                    >
                        <Select
                            value={values.feedbackDetail}
                            onValueChange={(value) =>
                                setValue(
                                    'feedbackDetail',
                                    value as OnboardingFormValues['feedbackDetail'],
                                    { shouldDirty: true, shouldValidate: true },
                                )
                            }
                        >
                            <SelectTrigger
                                aria-invalid={Boolean(errors.feedbackDetail)}
                            >
                                <SelectValue placeholder="Chọn mức phản hồi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CONCISE">
                                    Ngắn gọn
                                </SelectItem>
                                <SelectItem value="STANDARD">
                                    Tiêu chuẩn
                                </SelectItem>
                                <SelectItem value="DETAILED">
                                    Chi tiết
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
            </section>
        </div>
    );
}

export function ReviewStep({
    values,
    onEdit,
}: {
    values: OnboardingFormValues;
    onEdit?: () => void;
}) {
    const goalLabels = new Map(goalOptions);
    const contentLabels = new Map(contentOptions);
    const experienceLabels = new Map(
        experienceOptions.map(([key, label]) => [key, label]),
    );

    const difficultyLabel: Record<string, string> = {
        EASY: 'Dễ',
        MEDIUM: 'Trung bình',
        HARD: 'Khó',
        ADAPTIVE: 'Thích ứng',
    };
    const feedbackLabel: Record<string, string> = {
        CONCISE: 'Ngắn gọn',
        STANDARD: 'Tiêu chuẩn',
        DETAILED: 'Chi tiết',
    };

    const selectedGoals = values.interviewGoals
        .map((goal) =>
            goal === 'OTHER'
                ? (values.customInterviewGoal ?? 'Mục tiêu khác')
                : (goalLabels.get(goal) ?? goal),
        )
        .filter(Boolean);

    const selectedContent = values.contentPreferences.map(
        (item) => contentLabels.get(item) ?? item,
    );

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-sm bg-white">
                {/* ── Card header ── */}
                <div className="flex items-center justify-between pb-4">
                    <h2 className="text-xl font-extrabold text-slate-900">
                        Tóm tắt của bạn
                    </h2>
                    {onEdit && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="focus-visible:ring-primary !border-primary text-primary inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm font-extrabold transition hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:outline-none"
                        >
                            <Pencil className="size-4 stroke-3" />
                            Chỉnh sửa
                        </button>
                    )}
                </div>

                <div className="overflow-hidden rounded-xl">
                    <div className="flex flex-col md:flex-row">
                        <div className="flex min-w-0 flex-1 gap-5 p-6">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                                <UserRound className="size-8" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                    Họ và tên
                                </p>
                                <p className="mt-2 text-base font-extrabold text-slate-900">
                                    {values.fullName || (
                                        <span className="font-normal text-slate-400">
                                            Chưa thiết lập
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="hidden w-px shrink-0 bg-slate-200 md:my-6 md:block" />

                        <div className="flex min-w-0 flex-1 gap-5 border-t border-slate-200 p-6 md:border-0">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                                <Braces className="size-8" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                    Vị trí mục tiêu
                                </p>
                                <p className="mt-2 text-base font-extrabold text-slate-900">
                                    {values.targetRole || (
                                        <span className="font-normal text-slate-400">
                                            Chưa chọn
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="hidden w-px shrink-0 bg-slate-200 md:my-6 md:block" />

                        <div className="flex min-w-0 flex-1 gap-5 border-t border-slate-200 p-6 md:border-0">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                                <ChartNoAxesCombined className="size-8" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                    Cấp độ kinh nghiệm
                                </p>
                                <p className="mt-2 text-base font-extrabold text-slate-900">
                                    {values.experienceLevel ? (
                                        (experienceLabels.get(
                                            values.experienceLevel as (typeof experienceOptions)[number][0],
                                        ) ?? values.experienceLevel)
                                    ) : (
                                        <span className="font-normal text-slate-400">
                                            Chưa chọn
                                        </span>
                                    )}
                                </p>
                                {values.yearsOfExperience !== undefined && (
                                    <p className="text-muted-foreground mt-0.5 text-sm font-medium font-semibold">
                                        {values.yearsOfExperience} năm kinh
                                        nghiệm
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-200" />

                    <div className="flex flex-col md:flex-row">
                        <div className="flex min-w-0 flex-1 gap-5 p-6">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                                <Target className="size-8" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                    Mục tiêu
                                </p>
                                {selectedGoals.length > 0 ? (
                                    <ul className="mt-2 space-y-1.5">
                                        {selectedGoals.map((goal) => (
                                            <li
                                                key={goal}
                                                className="flex items-start gap-2 text-sm font-semibold text-slate-900"
                                            >
                                                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-slate-600" />
                                                {goal}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-sm text-slate-400">
                                        Chưa chọn
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="hidden w-px shrink-0 bg-slate-200 md:my-6 md:block" />

                        <div className="flex min-w-0 flex-1 gap-5 border-t border-slate-200 p-6 md:border-0">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                                <BookOpen className="size-8" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                    Phong cách học
                                </p>
                                <p className="mt-2 text-base font-extrabold text-slate-900">
                                    {values.learningStyle ? (
                                        (learningStyleOptions.find(
                                            ([key]) =>
                                                key === values.learningStyle,
                                        )?.[1] ?? values.learningStyle)
                                    ) : (
                                        <span className="font-normal text-slate-400">
                                            Chưa chọn
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="hidden w-px shrink-0 bg-slate-200 md:my-6 md:block" />

                        <div className="flex min-w-0 flex-1 gap-5 border-t border-slate-200 p-6 md:border-0">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                                <SlidersHorizontal className="size-8" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                    Nội dung quan tâm
                                </p>
                                {selectedContent.length > 0 ? (
                                    <ul className="mt-2 space-y-1.5">
                                        {selectedContent.map((item) => (
                                            <li
                                                key={item}
                                                className="flex items-start gap-2 text-sm font-semibold text-slate-900"
                                            >
                                                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-slate-600" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-sm text-slate-400">
                                        Chưa chọn
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-200" />

                    <div className="flex min-w-0 gap-5 p-6">
                        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                            <Clock3 className="size-8" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                Tùy chọn buổi luyện tập
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-3">
                                <div>
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                        Thời lượng mỗi buổi
                                    </p>
                                    <p className="mt-2 text-base font-extrabold text-slate-900">
                                        {values.sessionLength} phút
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                        Độ khó mặc định
                                    </p>
                                    <p className="mt-2 text-base font-extrabold text-slate-900">
                                        {difficultyLabel[
                                            values.defaultDifficulty ?? ''
                                        ] ?? values.defaultDifficulty}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                        Mức độ phản hồi
                                    </p>
                                    <p className="mt-2 text-base font-extrabold text-slate-900">
                                        {feedbackLabel[
                                            values.feedbackDetail ?? ''
                                        ] ?? values.feedbackDetail}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
                <Sparkles className="text-primary mt-0.5 size-5 shrink-0" />
                <div>
                    <p className="text-primary font-bold">
                        Chúng tôi sẽ cá nhân hóa trải nghiệm của bạn
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Dựa trên thông tin của bạn, chúng tôi sẽ đề xuất câu
                        hỏi, tài nguyên và lộ trình luyện tập phù hợp nhất.
                    </p>
                </div>
            </div>
        </div>
    );
}
