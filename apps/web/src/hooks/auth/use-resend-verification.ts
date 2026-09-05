import { useMutation } from '@tanstack/react-query';

import { resendVerification } from '@/services/auth.service';

export const useResendVerification = () => {
    return useMutation({
        mutationFn: resendVerification,
    });
};
