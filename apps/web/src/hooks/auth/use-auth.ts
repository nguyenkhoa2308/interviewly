'use client';

import axios from 'axios';
import { useEffect } from 'react';

import { useMe } from '@/hooks/auth/use-me';
import { markAuthenticatedSession } from '@/lib/auth-session';

export function useAuth({
    enabled = true,
    refetchOnMount = true,
}: {
    enabled?: boolean;
    refetchOnMount?: boolean | 'always';
} = {}) {
    const query = useMe({ enabled, refetchOnMount });
    const isUnauthenticated =
        enabled &&
        query.isError &&
        axios.isAxiosError(query.error) &&
        query.error.response?.status === 401;
    const isAuthenticated =
        Boolean(query.data) && query.isSuccess && !query.isFetching;

    useEffect(() => {
        if (isAuthenticated) markAuthenticatedSession();
    }, [isAuthenticated]);

    return {
        ...query,
        user: query.data ?? null,
        isAuthenticated,
        isUnauthenticated,
        isInitializing: enabled && (query.isPending || query.isFetching),
        isUnexpectedError: query.isError && !isUnauthenticated,
    };
}
