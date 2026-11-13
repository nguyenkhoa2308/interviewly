'use client';

import { Pencil, Save, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { AppPageHeader } from '@/components/layout/app-page-header';
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
                <AppPageHeader
                    eyebrow="Hồ sơ cá nhân"
                    title="Hồ sơ của bạn"
                    description={
                        isEditing
                            ? 'Cập nhật thông tin cá nhân và hồ sơ nghề nghiệp.'
                            : 'Quản lý thông tin cá nhân và định hướng nghề nghiệp.'
                    }
                    actions={
                        isEditing ? (
                            <div className="flex w-full gap-2.5 sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    className="hover:text-primary h-12 flex-1 rounded-lg px-5 text-sm font-bold sm:flex-none"
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
                                    className="h-12 flex-1 rounded-lg px-5 text-sm font-bold sm:flex-none"
                                    disabled={isSaving}
                                >
                                    <Save className="size-4" />
                                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                className="h-12 w-full rounded-lg px-5 text-sm font-bold sm:w-auto"
                                size="lg"
                                disabled={profileQuery.isPending}
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="size-4" />
                                Chỉnh sửa hồ sơ
                            </Button>
                        )
                    }
                    actionsClassName="w-full sm:w-auto"
                />

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
