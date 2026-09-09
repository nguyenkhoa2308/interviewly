import { deleteData, postData } from '@/lib/api-client';

export interface AvatarData {
    avatarUrl: string;
}

export interface AvatarResponse {
    success: true;
    data: AvatarData;
}

export function uploadAvatar(file: File) {
    const body = new FormData();
    body.append('avatar', file);

    return postData<AvatarResponse>('/profile/avatar', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
}

export function deleteAvatar() {
    return deleteData<{ success: true; data: { avatarUrl: null } }>(
        '/profile/avatar',
    );
}
