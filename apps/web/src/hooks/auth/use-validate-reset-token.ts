import { useQuery } from '@tanstack/react-query';

import { validateResetToken } from '@/services/auth.service';

export function useValidateResetToken(token: string | null) {
    return useQuery({
        queryKey: ['auth', 'reset-password', 'validate', token],
        queryFn: () => validateResetToken(token!),
        enabled: Boolean(token),
        retry: false,
        staleTime: 0,
    });
}
