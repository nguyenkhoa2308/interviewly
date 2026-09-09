'use client';

import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Check, LockKeyhole, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    goalOptions,
    experienceOptions,
} from '@/components/onboarding/onboarding-options';
import { AvatarCropDialog } from '@/components/profile/avatar-crop-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { authKeys } from '@/hooks/auth/use-me';
import { profileKeys } from '@/hooks/profile/use-profile';
import { cn } from '@/lib/utils';
import { deleteAvatar, uploadAvatar } from '@/services/avatar.service';
import type { CurrentUser } from '@/services/auth.service';
import type {
    ExperienceLevel,
    InterviewGoal,
} from '@/services/onboarding.service';
import { updateProfile, type UserProfile } from '@/services/profile.service';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProfileEditorProps {
    profile: UserProfile;
    onDirtyChange: (dirty: boolean) => void;
    onSavingChange: (saving: boolean) => void;
    onSaved: () => void;
}

type AvatarChange = 'keep' | 'upload' | 'delete';

export function ProfileEditor({
    profile,
    onDirtyChange,
    onSavingChange,
    onSaved,
}: ProfileEditorProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fullName, setFullName] = useState(profile.fullName);
    const [targetRole, setTargetRole] = useState(profile.targetRole ?? '');
    const [experienceLevel, setExperienceLevel] =
        useState<ExperienceLevel | null>(profile.experienceLevel);
    const [yearsOfExperience, setYearsOfExperience] = useState(
        profile.yearsOfExperience?.toString() ?? '',
    );
    const [goals, setGoals] = useState<InterviewGoal[]>(profile.interviewGoals);
    const [customGoal, setCustomGoal] = useState(
        profile.customInterviewGoal ?? '',
    );
    const [avatarChange, setAvatarChange] = useState<AvatarChange>('keep');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(
        profile.avatarUrl,
    );
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [fileToCrop, setFileToCrop] = useState<File | null>(null);
    const [cropOpen, setCropOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const dirty = useMemo(
        () =>
            fullName !== profile.fullName ||
            targetRole !== (profile.targetRole ?? '') ||
            experienceLevel !== profile.experienceLevel ||
            yearsOfExperience !==
                (profile.yearsOfExperience?.toString() ?? '') ||
            JSON.stringify(goals) !== JSON.stringify(profile.interviewGoals) ||
            customGoal !== (profile.customInterviewGoal ?? '') ||
            avatarChange !== 'keep',
        [
            avatarChange,
            customGoal,
            experienceLevel,
            fullName,
            goals,
            profile,
            targetRole,
            yearsOfExperience,
        ],
    );

    useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

    useEffect(() => {
        return () => {
            if (avatarPreview?.startsWith('blob:'))
                URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    const toggleGoal = (goal: InterviewGoal) => {
        setGoals((current) =>
            current.includes(goal)
                ? current.filter((item) => item !== goal)
                : [...current, goal],
        );
        setErrors((current) => ({ ...current, customGoal: '' }));
    };

    const handleFileSelection = (file: File | undefined) => {
        if (!file) return;
        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            toast.error('Định dạng ảnh không hợp lệ', {
                description: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.',
            });
            return;
        }
        if (file.size > MAX_AVATAR_SIZE) {
            toast.error('Ảnh vượt quá dung lượng cho phép', {
                description: 'Vui lòng chọn ảnh không quá 2 MB.',
            });
            return;
        }
        setFileToCrop(file);
        setCropOpen(true);
    };

    const handleCroppedAvatar = (file: File) => {
        const preview = URL.createObjectURL(file);
        setAvatarFile(file);
        setAvatarPreview(preview);
        setAvatarChange('upload');
    };

    const confirmDeleteAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        setAvatarChange('delete');
    };

    const validate = () => {
        const nextErrors: Record<string, string> = {};
        const trimmedName = fullName.trim();
        const trimmedRole = targetRole.trim();
        const parsedYears =
            yearsOfExperience === '' ? null : Number(yearsOfExperience);

        if (trimmedName.length < 2 || trimmedName.length > 150)
            nextErrors.fullName = 'Họ và tên phải có từ 2 đến 150 ký tự.';
        if (trimmedRole && (trimmedRole.length < 2 || trimmedRole.length > 100))
            nextErrors.targetRole =
                'Vị trí mục tiêu phải có từ 2 đến 100 ký tự.';
        if (
            parsedYears !== null &&
            (!Number.isFinite(parsedYears) ||
                parsedYears < 0 ||
                parsedYears > 99.9 ||
                !/^\d{1,2}(\.\d)?$/.test(yearsOfExperience))
        )
            nextErrors.yearsOfExperience =
                'Nhập số từ 0 đến 99.9, tối đa 1 chữ số thập phân.';
        if (goals.includes('OTHER') && !customGoal.trim())
            nextErrors.customGoal = 'Vui lòng nhập mục tiêu khác.';
        if (customGoal.trim().length > 255)
            nextErrors.customGoal =
                'Mục tiêu khác không được vượt quá 255 ký tự.';

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validate()) return;

        onSavingChange(true);
        try {
            const updated = await updateProfile({
                fullName: fullName.trim(),
                targetRole: targetRole.trim() || null,
                experienceLevel,
                yearsOfExperience:
                    yearsOfExperience === '' ? null : Number(yearsOfExperience),
                interviewGoals: goals,
                customInterviewGoal: goals.includes('OTHER')
                    ? customGoal.trim()
                    : null,
            });

            let finalAvatarUrl = updated.avatarUrl;
            if (avatarChange === 'upload' && avatarFile) {
                finalAvatarUrl = (await uploadAvatar(avatarFile)).data
                    .avatarUrl;
                await preloadAvatar(finalAvatarUrl);
            } else if (avatarChange === 'delete') {
                finalAvatarUrl = (await deleteAvatar()).data.avatarUrl;
            }

            const finalProfile = { ...updated, avatarUrl: finalAvatarUrl };
            queryClient.setQueryData(
                profileKeys.detail(finalProfile.id),
                finalProfile,
            );
            queryClient.setQueryData<CurrentUser>(authKeys.me, (current) =>
                current
                    ? {
                          ...current,
                          fullName: finalProfile.fullName,
                          avatarUrl: finalProfile.avatarUrl,
                      }
                    : current,
            );
            toast.success('Đã lưu thay đổi hồ sơ.');
            onSaved();
        } catch (error) {
            toast.error('Không thể lưu hồ sơ', {
                description: getErrorMessage(error),
            });
        } finally {
            onSavingChange(false);
        }
    };

    return (
        <>
            <form
                id="profile-edit-form"
                className="space-y-5"
                onSubmit={handleSubmit}
            >
                <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_12px_35px_rgba(72,52,120,0.05)] sm:p-7">
                    <div className="flex flex-col items-center gap-6 sm:flex-row">
                        <div className="relative shrink-0">
                            <Avatar className="size-32 ring-4 ring-violet-100">
                                {avatarPreview && (
                                    <AvatarImage
                                        src={avatarPreview}
                                        alt={`Ảnh đại diện của ${fullName}`}
                                    />
                                )}
                                <AvatarFallback className="text-2xl">
                                    {getInitials(fullName)}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                type="button"
                                aria-label="Chọn ảnh đại diện"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-primary text-primary-foreground absolute right-0 bottom-0 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-md"
                            >
                                <Camera className="size-4" />
                            </button>
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="text-lg font-extrabold text-slate-950">
                                Ảnh đại diện
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Ảnh đại diện sẽ hiển thị trên hồ sơ của bạn.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:justify-start">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className="!border-primary/50 text-primary hover:bg-primary/10 hover:text-primary h-10 rounded-sm font-bold"
                                >
                                    <Upload className="size-4" />
                                    Thay đổi ảnh
                                </Button>
                                {avatarPreview && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() =>
                                            setDeleteConfirmOpen(true)
                                        }
                                        className="h-10 rounded-sm font-bold"
                                    >
                                        <Trash2 className="size-4" />
                                        Xóa ảnh
                                    </Button>
                                )}
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                                Hỗ trợ JPEG, PNG, WebP. Dung lượng tối đa 2 MB.
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                onChange={(event) => {
                                    handleFileSelection(
                                        event.target.files?.[0],
                                    );
                                    event.target.value = '';
                                }}
                            />
                        </div>
                    </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-2">
                    <EditCard
                        title="Thông tin cá nhân"
                        description="Những thông tin cơ bản về bạn."
                    >
                        <Field
                            label="Họ và tên"
                            required
                            error={errors.fullName}
                        >
                            <Input
                                value={fullName}
                                maxLength={150}
                                className="h-11"
                                aria-invalid={Boolean(errors.fullName)}
                                onChange={(event) =>
                                    setFullName(event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Email"
                            helper="Email không thể thay đổi tại đây."
                        >
                            <div className="relative">
                                <Input
                                    value={profile.email}
                                    disabled
                                    className="h-11 pr-10"
                                />
                                <LockKeyhole className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </Field>
                    </EditCard>

                    <EditCard
                        title="Hồ sơ nghề nghiệp"
                        description="Thông tin giúp cá nhân hóa trải nghiệm phỏng vấn."
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Vị trí mục tiêu"
                                error={errors.targetRole}
                            >
                                <Input
                                    value={targetRole}
                                    maxLength={100}
                                    placeholder="Ví dụ: Backend Developer"
                                    className="h-11"
                                    aria-invalid={Boolean(errors.targetRole)}
                                    onChange={(event) =>
                                        setTargetRole(event.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Cấp độ kinh nghiệm">
                                <Select
                                    value={experienceLevel ?? 'NONE'}
                                    onValueChange={(value) =>
                                        setExperienceLevel(
                                            value === 'NONE'
                                                ? null
                                                : (value as ExperienceLevel),
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn cấp độ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">
                                            Chưa cập nhật
                                        </SelectItem>
                                        {experienceOptions.map(
                                            ([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <Field
                            label="Số năm kinh nghiệm"
                            error={errors.yearsOfExperience}
                            helper="Ví dụ: 0.5, 1, 2.5"
                        >
                            <Input
                                type="number"
                                min="0"
                                max="99.9"
                                step="0.1"
                                value={yearsOfExperience}
                                className="h-11"
                                aria-invalid={Boolean(errors.yearsOfExperience)}
                                onChange={(event) =>
                                    setYearsOfExperience(event.target.value)
                                }
                            />
                        </Field>
                    </EditCard>
                </div>

                <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_12px_35px_rgba(72,52,120,0.05)] sm:p-6">
                    <h2 className="text-lg font-extrabold text-slate-950">
                        Mục tiêu phỏng vấn
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Chọn một hoặc nhiều mục tiêu phù hợp với bạn.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                        {goalOptions.map(([value, label]) => {
                            const checked = goals.includes(value);
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={checked}
                                    onClick={() => toggleGoal(value)}
                                    className={cn(
                                        'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition',
                                        checked
                                            ? 'border-primary/35 bg-primary/5 text-primary'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-5 items-center justify-center rounded-[5px] border transition',
                                            checked
                                                ? 'border-primary bg-primary text-white'
                                                : 'border-slate-300 bg-white',
                                        )}
                                    >
                                        {checked && (
                                            <Check className="size-3.5 stroke-[3]" />
                                        )}
                                    </span>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    {goals.includes('OTHER') && (
                        <div className="mt-4 max-w-xl">
                            <Field
                                label="Mục tiêu khác"
                                required
                                error={errors.customGoal}
                            >
                                <Input
                                    value={customGoal}
                                    maxLength={255}
                                    placeholder="Nhập mục tiêu của bạn"
                                    className="h-11"
                                    aria-invalid={Boolean(errors.customGoal)}
                                    onChange={(event) =>
                                        setCustomGoal(event.target.value)
                                    }
                                />
                            </Field>
                        </div>
                    )}
                </section>
            </form>

            <AvatarCropDialog
                file={fileToCrop}
                open={cropOpen}
                onOpenChange={setCropOpen}
                onConfirm={handleCroppedAvatar}
            />
            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Xóa ảnh đại diện?"
                description="Ảnh hiện tại sẽ bị xóa sau khi bạn bấm Lưu thay đổi."
                confirmLabel="Xóa ảnh"
                destructive
                onConfirm={confirmDeleteAvatar}
            />
        </>
    );
}

function EditCard({
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
            <div className="mt-5 space-y-4">{children}</div>
        </section>
    );
}

function Field({
    label,
    required,
    helper,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    helper?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </span>
            {children}
            {error ? (
                <span className="block text-xs font-medium text-red-600">
                    {error}
                </span>
            ) : helper ? (
                <span className="block text-xs text-slate-500">{helper}</span>
            ) : null}
        </label>
    );
}

function getInitials(name: string) {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(-2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('') || 'U'
    );
}

function preloadAvatar(url: string): Promise<void> {
    return new Promise((resolve) => {
        const image = new Image();
        let completed = false;
        const finish = () => {
            if (completed) return;
            completed = true;
            window.clearTimeout(timeoutId);
            resolve();
        };
        const timeoutId = window.setTimeout(finish, 4_000);

        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
        image.src = url;
        if (image.complete) finish();
    });
}

interface ApiErrorResponse {
    error?: { message?: string | string[] };
}

function getErrorMessage(error: unknown): string {
    if (!axios.isAxiosError<ApiErrorResponse>(error))
        return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
    const message = error.response?.data?.error?.message;
    return Array.isArray(message)
        ? message[0]
        : (message ?? 'Không thể kết nối đến máy chủ.');
}
