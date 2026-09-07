import type { QueryClient } from '@tanstack/react-query';

import { authKeys } from '@/hooks/auth/use-me';
import type { CurrentUser } from '@/services/auth.service';
import type { OnboardingResponse } from '@/services/onboarding.service';
import { onboardingKeys } from './use-onboarding';

export function updateOnboardingCache(
    queryClient: QueryClient,
    response: OnboardingResponse,
) {
    const currentUser = queryClient.getQueryData<CurrentUser>(authKeys.me);

    if (currentUser) {
        queryClient.setQueryData(
            onboardingKeys.detail(currentUser.id),
            response,
        );
    }

    queryClient.setQueryData<CurrentUser>(authKeys.me, (current) =>
        current
            ? {
                  ...current,
                  fullName: response.data.fullName,
                  avatarUrl: response.data.avatarUrl,
                  onboardingCompletedAt: response.data.onboardingCompletedAt,
              }
            : current,
    );
}
