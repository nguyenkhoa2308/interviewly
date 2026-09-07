import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    completeOnboarding,
    skipOnboarding,
} from '@/services/onboarding.service';
import { updateOnboardingCache } from './onboarding-cache';

export function useCompleteOnboarding() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: completeOnboarding,
        onSuccess: (response) => updateOnboardingCache(queryClient, response),
    });
}

export function useSkipOnboarding() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: skipOnboarding,
        onSuccess: (response) => updateOnboardingCache(queryClient, response),
    });
}
