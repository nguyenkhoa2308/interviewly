import { beforeEach, describe, expect, it } from 'vitest';

import {
    getSpeechRecognitionConstructor,
    joinSpeechRecognitionResults,
    resolveVietnameseSpeechVoice,
    readInterviewVoicePreference,
    supportsSpeechRecognition,
    writeInterviewVoicePreference,
} from './interview-voice';

describe('interview voice preferences', () => {
    beforeEach(() => {
        sessionStorage.clear();
        delete window.SpeechRecognition;
        delete window.webkitSpeechRecognition;
    });

    it('falls back to text without a stored device choice', () => {
        expect(readInterviewVoicePreference('interview-1')).toEqual({
            inputMode: 'TEXT',
            outputMode: 'TEXT_ONLY',
        });
    });

    it('keeps input and output modes independent for a session', () => {
        writeInterviewVoicePreference('interview-1', {
            inputMode: 'TEXT',
            outputMode: 'VOICE_AND_TEXT',
        });
        expect(readInterviewVoicePreference('interview-1')).toEqual({
            inputMode: 'TEXT',
            outputMode: 'VOICE_AND_TEXT',
        });
    });

    it('joins recognition chunks with normalized spaces', () => {
        expect(
            joinSpeechRecognitionResults({
                0: { 0: { transcript: '  Tôi đang ' } },
                1: { 0: { transcript: 'nói nhanh' } },
                2: { 0: { transcript: '  một   chút  ' } },
                length: 3,
            }),
        ).toBe('Tôi đang nói nhanh một chút');
    });
    it('ignores a saved non-Vietnamese voice and falls back to Vietnamese', () => {
        const voices = [
            { name: 'English Voice', lang: 'en-US', default: true },
            { name: 'Vietnamese Voice', lang: 'vi-VN', default: false },
        ];

        expect(
            resolveVietnameseSpeechVoice(voices, 'English Voice')?.name,
        ).toBe('Vietnamese Voice');
    });

    it('keeps the preferred Vietnamese voice', () => {
        const voices = [
            { name: 'Vietnamese One', lang: 'vi-VN' },
            { name: 'Vietnamese Two', lang: 'vi_VN' },
        ];

        expect(
            resolveVietnameseSpeechVoice(voices, 'Vietnamese Two')?.name,
        ).toBe('Vietnamese Two');
    });
    it('detects the prefixed browser speech recognition API', () => {
        class Recognition {}
        window.webkitSpeechRecognition =
            Recognition as unknown as SpeechRecognitionConstructor;
        expect(supportsSpeechRecognition()).toBe(true);
        expect(getSpeechRecognitionConstructor()).toBe(Recognition);
    });
});
