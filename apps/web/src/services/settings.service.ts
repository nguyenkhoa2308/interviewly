import { getData, patchData } from '@/lib/api-client';
import type { Settings, UpdateSettingsPayload } from '@/types/settings';

interface SettingsResponse {
    success: true;
    data: Settings;
}

export async function getSettings(): Promise<Settings> {
    const response = await getData<SettingsResponse>('/settings');
    return response.data;
}

export async function updateSettings(
    payload: UpdateSettingsPayload,
): Promise<Settings> {
    const response = await patchData<SettingsResponse>('/settings', payload);
    return response.data;
}
