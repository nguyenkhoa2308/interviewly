'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSettings, updateSettings } from '@/services/settings.service';
import type { Settings, UpdateSettingsPayload } from '@/types/settings';

export const settingsKeys = {
    all: ['settings'] as const,
};

export function useSettings() {
    return useQuery({
        queryKey: settingsKeys.all,
        queryFn: getSettings,
        retry: false,
        meta: { requiresAuth: true },
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateSettings,
        onSuccess: (settings, updates) => {
            queryClient.setQueryData<Settings>(settingsKeys.all, (current) =>
                mergeUpdatedSettings(current, settings, updates),
            );
            void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
        },
    });
}

function mergeUpdatedSettings(
    current: Settings | undefined,
    response: Settings,
    updates: UpdateSettingsPayload,
): Settings {
    if (!current) return response;

    return {
        general: updates.general
            ? { ...current.general, ...updates.general }
            : current.general,
        interviewPreferences: updates.interviewPreferences
            ? {
                  ...current.interviewPreferences,
                  ...updates.interviewPreferences,
              }
            : current.interviewPreferences,
        learningAndFeedback: updates.learningAndFeedback
            ? { ...current.learningAndFeedback, ...updates.learningAndFeedback }
            : current.learningAndFeedback,
        voiceAndAudio: updates.voiceAndAudio
            ? { ...current.voiceAndAudio, ...updates.voiceAndAudio }
            : current.voiceAndAudio,
    };
}
