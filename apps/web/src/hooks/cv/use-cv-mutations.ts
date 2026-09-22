'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cvKeys } from '@/hooks/cv/cv-keys';
import {
    deleteCv,
    renameCv,
    setDefaultCv,
    uploadCv,
    uploadCvVersion,
    setCurrentCvVersion,
} from '@/services/cv.service';
import type { RenameCvPayload } from '@/types/cv';

export function useUploadCv() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: uploadCv,
        retry: false,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: cvKeys.lists() }),
    });
}

function invalidateCvVersionState(
    queryClient: ReturnType<typeof useQueryClient>,
    cvId: string,
) {
    return Promise.all([
        queryClient.invalidateQueries({ queryKey: cvKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: cvKeys.detail(cvId) }),
        queryClient.invalidateQueries({ queryKey: cvKeys.versions(cvId) }),
        queryClient.invalidateQueries({ queryKey: cvKeys.analyses(cvId) }),
    ]);
}

export function useUploadCvVersion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cvId, file }: { cvId: string; file: File }) =>
            uploadCvVersion(cvId, file),
        retry: false,
        onSuccess: (_, variables) =>
            invalidateCvVersionState(queryClient, variables.cvId),
    });
}

export function useSetCurrentCvVersion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            cvId,
            versionId,
        }: {
            cvId: string;
            versionId: string;
        }) => setCurrentCvVersion(cvId, versionId),
        retry: false,
        onSuccess: (_, variables) =>
            invalidateCvVersionState(queryClient, variables.cvId),
    });
}

export function useRenameCv() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            cvId,
            payload,
        }: {
            cvId: string;
            payload: RenameCvPayload;
        }) => renameCv(cvId, payload),
        retry: false,
        onSuccess: async (_, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: cvKeys.lists() }),
                queryClient.invalidateQueries({
                    queryKey: cvKeys.detail(variables.cvId),
                }),
            ]);
        },
    });
}

export function useSetDefaultCv() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: setDefaultCv,
        retry: false,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: cvKeys.lists() }),
                queryClient.invalidateQueries({ queryKey: cvKeys.details() }),
            ]);
        },
    });
}

export function useDeleteCv() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCv,
        retry: false,
        onSuccess: async (_, cvId) => {
            queryClient.removeQueries({ queryKey: cvKeys.detail(cvId) });
            await queryClient.invalidateQueries({ queryKey: cvKeys.lists() });
        },
    });
}
