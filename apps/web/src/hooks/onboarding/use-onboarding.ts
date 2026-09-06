import { useQuery } from '@tanstack/react-query';

import { getOnboarding } from '@/services/onboarding.service';

export const onboardingKeys = {
    all: ['onboarding'] as const,
    detail: (userId: string) => ['onboarding', userId] as const,
};

export function useOnboarding(userId?: string) {
    return useQuery({
        queryKey: onboardingKeys.detail(userId ?? ''),
        queryFn: getOnboarding,
        retry: false,
        enabled: Boolean(userId),
    });
}
