import type { QueryClient } from '@tanstack/react-query';

import { authKeys } from '@/hooks/auth/use-me';
import type { GetMeResponse } from '@/services/auth.service';
import type { OnboardingResponse } from '@/services/onboarding.service';
import { onboardingKeys } from './use-onboarding';

export function updateOnboardingCache(
    queryClient: QueryClient,
    response: OnboardingResponse,
) {
    const currentUser = queryClient.getQueryData<GetMeResponse>(authKeys.me);

    if (currentUser) {
        queryClient.setQueryData(
            onboardingKeys.detail(currentUser.data.id),
            response,
        );
    }

    queryClient.setQueryData<GetMeResponse>(
        authKeys.me,
        (current) =>
            current && {
                ...current,
                data: {
                    ...current.data,
                    fullName: response.data.fullName,
                    avatarUrl: response.data.avatarUrl,
                    onboardingCompletedAt: response.data.onboardingCompletedAt,
                },
            },
    );
}
