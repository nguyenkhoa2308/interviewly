'use client';

import { ErrorState } from '@/components/common/error-state';
import { AccountSecuritySettings } from '@/components/settings/sections/account-security-settings';
import { DangerZoneSettings } from '@/components/settings/sections/danger-zone-settings';
import { GeneralSettings } from '@/components/settings/sections/general-settings';
import { InterviewPreferencesSettings } from '@/components/settings/sections/interview-preferences-settings';
import { LearningFeedbackSettings } from '@/components/settings/sections/learning-feedback-settings';
import { NotificationSettings } from '@/components/settings/sections/notification-settings';
import { PrivacyDataSettings } from '@/components/settings/sections/privacy-data-settings';
import { VoiceAudioSettings } from '@/components/settings/sections/voice-audio-settings';
import { useMe } from '@/hooks/auth/use-me';
import { useSettings } from '@/hooks/settings';

export function SettingsPage() {
    const settingsQuery = useSettings();
    const meQuery = useMe();

    if (settingsQuery.isPending) {
        return <SettingsPageSkeleton />;
    }

    if (settingsQuery.isError) {
        return (
            <SettingsPageFrame>
                <div className="rounded-2xl border border-violet-100 bg-white px-5 py-10 shadow-[0_12px_32px_rgba(45,31,89,0.045)]">
                    <ErrorState
                        title="Không thể tải cài đặt"
                        description="Đã có lỗi khi tải tùy chọn của bạn. Hãy kiểm tra kết nối và thử lại."
                        onRetry={() => void settingsQuery.refetch()}
                    />
                </div>
            </SettingsPageFrame>
        );
    }

    const settings = settingsQuery.data;

    return (
        <SettingsPageFrame>
            <GeneralSettings data={settings.general} />
            <InterviewPreferencesSettings
                data={settings.interviewPreferences}
            />
            <LearningFeedbackSettings data={settings.learningAndFeedback} />
            <VoiceAudioSettings data={settings.voiceAndAudio} />
            <NotificationSettings />
            <PrivacyDataSettings />
            <AccountSecuritySettings
                user={meQuery.data}
                isLoading={meQuery.isPending}
            />
            <DangerZoneSettings user={meQuery.data} />
        </SettingsPageFrame>
    );
}

function SettingsPageFrame({ children }: { children: React.ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <header className="mb-5">
                <div className="max-w-2xl">
                    <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
                        Quản lý tài khoản
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                        Cài đặt
                    </h1>
                    <p className="mt-2 max-w-lg text-sm leading-6 font-medium text-slate-500 sm:text-[15px]">
                        Quản lý trải nghiệm Interviewly và các thiết lập tài
                        khoản của bạn.
                    </p>
                </div>
            </header>
            <div className="space-y-5">{children}</div>
        </div>
    );
}

function SettingsPageSkeleton() {
    return (
        <div
            aria-label="Đang tải cài đặt"
            aria-busy="true"
            className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"
        >
            <div className="mb-6 space-y-2">
                <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-5 w-full max-w-md animate-pulse rounded-md bg-slate-200/80" />
            </div>
            <div className="space-y-5">
                {[3, 4, 3].map((rowCount, sectionIndex) => (
                    <div
                        key={`${rowCount}-${sectionIndex}`}
                        className="overflow-hidden rounded-2xl border border-violet-100 bg-white"
                    >
                        <div className="flex gap-3 border-b border-violet-100 bg-violet-50/45 px-5 py-5 sm:px-6">
                            <div className="size-10 animate-pulse rounded-xl bg-violet-100" />
                            <div className="flex-1 space-y-2 py-0.5">
                                <div className="h-5 w-44 animate-pulse rounded-md bg-slate-200" />
                                <div className="h-4 w-full max-w-sm animate-pulse rounded-md bg-slate-100" />
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {Array.from({ length: rowCount }).map((_, row) => (
                                <div
                                    key={row}
                                    className="grid min-h-20 gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]"
                                >
                                    <div className="space-y-2">
                                        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                                        <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
                                    </div>
                                    <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
