import { useMutation } from '@tanstack/react-query';

import { register } from '@/services/auth.service';

export function useRegister() {
    return useMutation({
        mutationFn: register,
    });
}
