'use client';

import { Pencil, Save, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { ProfileEditor } from '@/components/profile/profile-editor';
import ProfileOverview from '@/components/profile/profile-overview';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useProfile } from '@/hooks/profile/use-profile';

export function ProfilePageContent() {
    const profileQuery = useProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const handleDirtyChange = useCallback(
        (dirty: boolean) => setIsDirty(dirty),
        [],
    );
    const handleSavingChange = useCallback(
        (saving: boolean) => setIsSaving(saving),
        [],
    );

    const cancelEditing = () => {
        if (isDirty) setCancelConfirmOpen(true);
        else setIsEditing(false);
    };

    if (profileQuery.isError) {
        return (
            <ErrorState
                title="Không thể tải hồ sơ"
                description="Đã có lỗi khi tải thông tin của bạn."
                onRetry={() => void profileQuery.refetch()}
            />
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="space-y-5">
                <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                            Hồ sơ của bạn
                        </h1>
                        <p className="mt-1 text-[15px] font-medium text-slate-500">
                            {isEditing
                                ? 'Cập nhật thông tin cá nhân và hồ sơ nghề nghiệp.'
                                : 'Quản lý thông tin cá nhân và định hướng nghề nghiệp.'}
                        </p>
                    </div>
                    {isEditing ? (
                        <div className="flex w-full gap-2.5 sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="hover:text-primary h-10 flex-1 rounded-sm font-semibold sm:flex-none"
                                disabled={isSaving}
                                onClick={cancelEditing}
                            >
                                <X className="size-4" />
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                form="profile-edit-form"
                                size="lg"
                                className="h-10 flex-1 rounded-sm font-semibold sm:flex-none"
                                disabled={isSaving}
                            >
                                <Save className="size-4" />
                                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            className="w-full font-semibold sm:w-auto"
                            size="lg"
                            disabled={profileQuery.isPending}
                            onClick={() => setIsEditing(true)}
                        >
                            <Pencil className="size-4" />
                            Chỉnh sửa hồ sơ
                        </Button>
                    )}
                </header>

                {isEditing && profileQuery.data ? (
                    <ProfileEditor
                        profile={profileQuery.data}
                        onDirtyChange={handleDirtyChange}
                        onSavingChange={handleSavingChange}
                        onSaved={() => {
                            setIsDirty(false);
                            setIsEditing(false);
                        }}
                    />
                ) : (
                    <ProfileOverview />
                )}
            </div>

            <ConfirmDialog
                open={cancelConfirmOpen}
                onOpenChange={setCancelConfirmOpen}
                title="Hủy các thay đổi?"
                description="Những thông tin bạn vừa chỉnh sửa sẽ không được lưu."
                confirmLabel="Hủy thay đổi"
                destructive
                onConfirm={() => {
                    setIsDirty(false);
                    setIsEditing(false);
                }}
            />
        </div>
    );
}
