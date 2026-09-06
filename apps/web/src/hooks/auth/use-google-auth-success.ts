'use client';

import { toast } from 'sonner';

import { useAuthRouting } from './use-auth-routing';

export function useGoogleAuthSuccess() {
    const { routeAuthenticatedUser } = useAuthRouting();

    const handleGoogleSuccess = async () => {
        try {
            await routeAuthenticatedUser();

            toast.success('Đăng nhập Google thành công');
        } catch {
            toast.error('Không thể hoàn tất đăng nhập', {
                description: 'Vui lòng thử lại.',
            });
        }
    };

    return { handleGoogleSuccess };
}
