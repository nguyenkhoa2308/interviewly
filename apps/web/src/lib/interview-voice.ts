export type InterviewInputMode = 'VOICE' | 'TEXT';
export type InterviewOutputMode = 'VOICE_AND_TEXT' | 'TEXT_ONLY';

export interface InterviewVoicePreference {
    inputMode: InterviewInputMode;
    outputMode: InterviewOutputMode;
}

export const interviewVoiceStorageKey = (interviewId: string) =>
    `interviewly:voice:${interviewId}`;

export function getSpeechRecognitionConstructor() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function joinSpeechRecognitionResults(results: {
    readonly length: number;
    readonly [index: number]: {
        readonly [index: number]: { readonly transcript: string };
    };
}) {
    const segments: string[] = [];
    for (let index = 0; index < results.length; index += 1) {
        const segment = results[index]?.[0]?.transcript
            .trim()
            .replace(/\s+/gu, ' ');
        if (segment) segments.push(segment);
    }
    return segments.join(' ');
}
export function supportsSpeechRecognition() {
    return Boolean(getSpeechRecognitionConstructor());
}

export function supportsSpeechSynthesis() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
export function isVietnameseSpeechVoice(voice: { lang: string }) {
    return voice.lang.toLowerCase().replace('_', '-').startsWith('vi-');
}
export function resolveVietnameseSpeechVoice<
    TVoice extends {
        name: string;
        lang: string;
        default?: boolean;
        localService?: boolean;
    },
>(voices: readonly TVoice[], preferredName?: string | null) {
    const vietnameseVoices = voices.filter(isVietnameseSpeechVoice);
    const preferredVoice = vietnameseVoices.find(
        (voice) => voice.name === preferredName,
    );
    return (
        preferredVoice ??
        vietnameseVoices.find((voice) => voice.default) ??
        vietnameseVoices.find((voice) => voice.localService) ??
        vietnameseVoices[0]
    );
}

export function readInterviewVoicePreference(
    interviewId: string,
): InterviewVoicePreference {
    const fallback: InterviewVoicePreference = {
        inputMode: 'TEXT',
        outputMode: 'TEXT_ONLY',
    };
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = sessionStorage.getItem(
            interviewVoiceStorageKey(interviewId),
        );
        if (!raw) return fallback;
        const value = JSON.parse(raw) as Partial<InterviewVoicePreference>;
        return {
            inputMode: value.inputMode === 'VOICE' ? 'VOICE' : 'TEXT',
            outputMode:
                value.outputMode === 'VOICE_AND_TEXT'
                    ? 'VOICE_AND_TEXT'
                    : 'TEXT_ONLY',
        };
    } catch {
        return fallback;
    }
}

export function writeInterviewVoicePreference(
    interviewId: string,
    value: InterviewVoicePreference,
) {
    sessionStorage.setItem(
        interviewVoiceStorageKey(interviewId),
        JSON.stringify(value),
    );
}
