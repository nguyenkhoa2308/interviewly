import { useMutation, useQueryClient } from '@tanstack/react-query';

import { skipOnboarding } from '@/services/onboarding.service';
import { updateOnboardingCache } from './onboarding-cache';

export function useSkipOnboarding() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: skipOnboarding,
        onSuccess: (response) => {
            updateOnboardingCache(queryClient, response);
        },
    });
}
