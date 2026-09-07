'use client';

import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { authKeys } from '@/hooks/auth/use-me';
import { onboardingKeys } from '@/hooks/onboarding/use-onboarding';
import { clearObservedSession } from '@/lib/auth-session';
import { logout } from '@/services/auth.service';

export function useLogout() {
    const queryClient = useQueryClient();
    const router = useRouter();

    const finishLogout = async () => {
        clearObservedSession();
        await queryClient.cancelQueries({ queryKey: authKeys.all });
        queryClient.removeQueries({ queryKey: authKeys.all });
        queryClient.removeQueries({ queryKey: onboardingKeys.all });
        queryClient.removeQueries({
            predicate: (query) => query.meta?.requiresAuth === true,
        });
        router.replace('/sign-in');
        toast.success('Đăng xuất thành công.');
    };

    return useMutation({
        mutationFn: logout,
        onSuccess: finishLogout,
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                void finishLogout();
                return;
            }
            toast.error('Không thể đăng xuất', {
                description:
                    'Không thể kết nối đến máy chủ. Vui lòng thử lại để kết thúc phiên an toàn.',
            });
        },
    });
}
