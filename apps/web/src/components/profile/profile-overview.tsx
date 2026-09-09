'use client';

import Link from 'next/link';
import {
    ArrowRight,
    BadgeCheck,
    BarChart3,
    BriefcaseBusiness,
    Camera,
    Mail,
    Sparkles,
    Target,
    UserRound,
} from 'lucide-react';

import { ErrorState } from '@/components/common/error-state';
import { ProfileQuoteWave } from '@/components/decorations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/profile/use-profile';
import type {
    ExperienceLevel,
    InterviewGoal,
} from '@/services/onboarding.service';

const experienceLabels: Record<ExperienceLevel, string> = {
    INTERN: 'Thực tập sinh',
    FRESHER: 'Fresher',
    JUNIOR: 'Junior',
    MIDDLE: 'Middle',
    SENIOR: 'Senior',
    LEAD: 'Lead',
};

const goalLabels: Record<InterviewGoal, string> = {
    GET_A_JOB: 'Tìm được công việc phù hợp',
    IMPROVE_SKILLS: 'Nâng cao kỹ năng chuyên môn',
    CRACK_TOP_COMPANIES: 'Chinh phục công ty hàng đầu',
    SWITCH_CAREER: 'Chuyển hướng nghề nghiệp',
    BOOST_INTERVIEW_CONFIDENCE: 'Tự tin hơn khi phỏng vấn',
    IMPROVE_RESUME: 'Hoàn thiện CV',
    PRACTICE_COMMUNICATION: 'Rèn luyện giao tiếp',
    OTHER: 'Mục tiêu khác',
};

export default function ProfileOverview() {
    const profileQuery = useProfile();

    if (profileQuery.isPending) return <ProfileSkeleton />;
    if (profileQuery.isError) {
        return (
            <ErrorState
                title="Không thể tải hồ sơ"
                description="Đã có lỗi khi tải thông tin của bạn. Vui lòng thử lại."
                onRetry={() => void profileQuery.refetch()}
            />
        );
    }

    const profile = profileQuery.data;
    const experience = profile.experienceLevel
        ? experienceLabels[profile.experienceLevel]
        : 'Chưa cập nhật';
    const goals = profile.interviewGoals.map((goal) =>
        goal === 'OTHER' && profile.customInterviewGoal
            ? profile.customInterviewGoal
            : goalLabels[goal],
    );

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_12px_35px_rgba(72,52,120,0.06)]">
                <div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                    <div className="relative flex min-w-0 flex-col items-center gap-5 p-5 after:absolute after:top-6 after:right-0 after:bottom-6 after:hidden after:w-px after:bg-violet-100 sm:flex-row sm:p-7 xl:after:block">
                        <div className="relative shrink-0">
                            <Avatar className="size-28 ring-4 ring-violet-100 sm:size-32">
                                {profile.avatarUrl && (
                                    <AvatarImage
                                        src={profile.avatarUrl}
                                        alt={`Ảnh đại diện của ${profile.fullName}`}
                                    />
                                )}
                                <AvatarFallback className="text-2xl">
                                    {getInitials(profile.fullName) || (
                                        <UserRound className="size-8" />
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                type="button"
                                aria-label="Thay ảnh đại diện"
                                className="bg-primary text-primary-foreground focus-visible:ring-primary absolute right-0 bottom-0 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-md transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                                <Camera className="size-4" />
                            </button>
                        </div>

                        <div className="min-w-0 text-center sm:text-left">
                            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                <h2 className="truncate text-2xl font-extrabold tracking-tight text-slate-950">
                                    {profile.fullName}
                                </h2>
                                {profile.emailVerifiedAt && <VerifiedBadge />}
                            </div>
                            <div className="mt-4 space-y-2 text-sm font-medium text-slate-600 sm:text-[15px]">
                                <MetaLine icon={Mail}>{profile.email}</MetaLine>
                                <MetaLine icon={BriefcaseBusiness}>
                                    {profile.targetRole ??
                                        'Chưa cập nhật vị trí mục tiêu'}
                                </MetaLine>
                                <MetaLine icon={BarChart3}>
                                    {experience}
                                    {profile.yearsOfExperience !== null &&
                                        ` · ${formatYears(profile.yearsOfExperience)} năm kinh nghiệm`}
                                </MetaLine>
                            </div>
                        </div>
                    </div>

                    <blockquote className="relative hidden min-h-full items-center self-stretch overflow-hidden text-lg leading-relaxed font-semibold text-slate-500 xl:flex">
                        <ProfileQuoteWave />
                        <span className="relative z-10 px-8 py-7">
                            “Mỗi buổi luyện tập hôm nay sẽ giúp bạn tự tin hơn
                            trong buổi phỏng vấn ngày mai.”
                        </span>
                    </blockquote>
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
                <InfoCard
                    title="Thông tin cá nhân"
                    description="Những thông tin cơ bản về tài khoản của bạn."
                >
                    <InfoRow
                        icon={UserRound}
                        label="Họ và tên"
                        value={profile.fullName}
                    />
                    <InfoRow
                        icon={Mail}
                        label="Email"
                        value={profile.email}
                        // trailing={
                        //     profile.emailVerifiedAt ? <VerifiedBadge /> : null
                        // }
                    />
                </InfoCard>

                <InfoCard
                    title="Hồ sơ nghề nghiệp"
                    description="Thông tin giúp cá nhân hóa trải nghiệm phỏng vấn."
                >
                    <InfoRow
                        icon={BriefcaseBusiness}
                        label="Vị trí mục tiêu"
                        value={profile.targetRole ?? 'Chưa cập nhật'}
                    />
                    <InfoRow
                        icon={BarChart3}
                        label="Cấp độ kinh nghiệm"
                        value={experience}
                    />
                    <InfoRow
                        icon={Target}
                        label="Số năm kinh nghiệm"
                        value={
                            profile.yearsOfExperience === null
                                ? 'Chưa cập nhật'
                                : `${formatYears(profile.yearsOfExperience)} năm`
                        }
                    />
                </InfoCard>
            </div>

            <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_12px_35px_rgba(72,52,120,0.05)] sm:p-6">
                <SectionHeading
                    icon={Target}
                    title="Mục tiêu phỏng vấn"
                    description="Những điều bạn muốn đạt được khi sử dụng Interviewly."
                />
                <div className="mt-5 flex flex-wrap gap-2.5">
                    {goals.length ? (
                        goals.map((goal) => (
                            <span
                                key={goal}
                                className="border-primary/15 bg-primary/5 text-primary rounded-xl border px-3.5 py-2 text-sm font-semibold"
                            >
                                {goal}
                            </span>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500">
                            Bạn chưa chọn mục tiêu phỏng vấn.
                        </p>
                    )}
                </div>
            </section>

            <section className="border-primary/15 bg-primary/5 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <SectionHeading
                    icon={Sparkles}
                    title="Sẵn sàng cho buổi luyện tập tiếp theo?"
                    description="Interviewly sẽ cá nhân hóa câu hỏi dựa trên hồ sơ này."
                    filled
                />
                <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/practice">
                        Bắt đầu luyện tập <ArrowRight className="size-4" />
                    </Link>
                </Button>
            </section>
        </div>
    );
}

function InfoCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_12px_35px_rgba(72,52,120,0.05)] sm:p-6">
            <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
            <div className="mt-5 divide-y divide-slate-100">{children}</div>
        </section>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
    trailing,
}: {
    icon: typeof UserRound;
    label: string;
    value: string;
    trailing?: React.ReactNode;
}) {
    return (
        <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-center">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
                <span className="bg-primary/8 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                </span>
                {label}
            </div>
            <p className="min-w-0 truncate text-sm font-bold text-slate-900">
                {value}
            </p>
            {trailing}
        </div>
    );
}

function MetaLine({
    icon: Icon,
    children,
}: {
    icon: typeof UserRound;
    children: React.ReactNode;
}) {
    return (
        <p className="flex items-center justify-center gap-2 sm:justify-start">
            <Icon className="size-4 shrink-0 text-slate-400" />
            <span className="truncate">{children}</span>
        </p>
    );
}

function SectionHeading({
    icon: Icon,
    title,
    description,
    filled = false,
}: {
    icon: typeof UserRound;
    title: string;
    description: string;
    filled?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <div
                className={
                    filled
                        ? 'bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl'
                        : 'bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl'
                }
            >
                <Icon className="size-5" />
            </div>
            <div>
                <h2 className="font-extrabold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
            </div>
        </div>
    );
}

function VerifiedBadge() {
    return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
            <BadgeCheck className="size-3.5" />
            Đã xác thực
        </span>
    );
}

function ProfileSkeleton() {
    return (
        <div className="space-y-5" aria-label="Đang tải hồ sơ">
            <div className="h-48 animate-pulse rounded-2xl border border-violet-100 bg-white" />
            <div className="grid gap-5 xl:grid-cols-2">
                <div className="h-56 animate-pulse rounded-2xl border border-violet-100 bg-white" />
                <div className="h-56 animate-pulse rounded-2xl border border-violet-100 bg-white" />
            </div>
            <div className="h-36 animate-pulse rounded-2xl border border-violet-100 bg-white" />
        </div>
    );
}

function getInitials(fullName: string): string {
    return fullName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

function formatYears(years: number): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(
        years,
    );
}
