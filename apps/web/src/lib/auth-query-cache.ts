import type { QueryClient } from '@tanstack/react-query';

import { authKeys } from '@/hooks/auth/use-me';
import { onboardingKeys } from '@/hooks/onboarding/use-onboarding';

const requiresAuth = (query: { meta?: Readonly<Record<string, unknown>> }) =>
    query.meta?.requiresAuth === true;

export async function clearAuthenticatedQueries(
    queryClient: QueryClient,
): Promise<void> {
    await Promise.all([
        queryClient.cancelQueries({ queryKey: authKeys.all }),
        queryClient.cancelQueries({ queryKey: onboardingKeys.all }),
        queryClient.cancelQueries({ predicate: requiresAuth }),
    ]);

    queryClient.removeQueries({ queryKey: authKeys.all });
    queryClient.removeQueries({ queryKey: onboardingKeys.all });
    queryClient.removeQueries({ predicate: requiresAuth });
}
