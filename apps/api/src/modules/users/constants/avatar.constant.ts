import { randomUUID } from 'node:crypto';

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = /^(image\/jpeg|image\/png|image\/webp)$/;

export const AVATAR_PRESETS = [
    'interviewly-amber',
    'interviewly-bolt',
    'interviewly-cobalt',
    'interviewly-delta',
    'interviewly-echo',
    'interviewly-flux',
    'interviewly-glow',
    'interviewly-helix',
    'interviewly-ion',
    'interviewly-jade',
    'interviewly-kite',
    'interviewly-luna',
] as const;

export type AvatarPreset = (typeof AVATAR_PRESETS)[number];

export function isAvatarPreset(value: unknown): value is AvatarPreset {
    return (
        typeof value === 'string' &&
        (AVATAR_PRESETS as readonly string[]).includes(value)
    );
}

export function getAvatarObjectKey(userId: string): string {
    return `avatars/${userId}/avatar.webp`;
}

export function getDiceBearAvatarUrl(preset: AvatarPreset): string {
    return `https://api.dicebear.com/10.x/voxel-bot/svg?seed=${encodeURIComponent(preset)}`;
}

export function withAvatarCacheVersion(publicUrl: string): string {
    const separator = publicUrl.includes('?') ? '&' : '?';
    return `${publicUrl}${separator}v=${randomUUID()}`;
}
