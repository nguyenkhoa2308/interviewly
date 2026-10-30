'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    getSpeechRecognitionConstructor,
    joinSpeechRecognitionResults,
    resolveVietnameseSpeechVoice,
} from '@/lib/interview-voice';

export function useInterviewSpeechRecognition({
    language = 'vi-VN',
    onTranscript,
}: {
    language?: string;
    onTranscript: (text: string) => void;
}) {
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const [listening, setListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const stop = useCallback(() => recognitionRef.current?.stop(), []);
    const abort = useCallback(() => {
        recognitionRef.current?.abort();
        recognitionRef.current = null;
        setListening(false);
    }, []);

    useEffect(() => abort, [abort]);

    const start = useCallback(() => {
        const Recognition = getSpeechRecognitionConstructor();
        if (!Recognition) {
            setError('Trình duyệt này chưa hỗ trợ nhận dạng giọng nói.');
            return;
        }
        abort();
        const recognition = new Recognition();
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.onstart = () => {
            setError(null);
            setListening(true);
        };
        recognition.onend = () => setListening(false);
        recognition.onerror = (event) => {
            setListening(false);
            setError(
                event.error === 'not-allowed'
                    ? 'Quyền sử dụng micro đã bị từ chối.'
                    : 'Không thể nhận dạng giọng nói. Bạn có thể chuyển sang nhập văn bản.',
            );
        };
        recognition.onresult = (event) => {
            onTranscript(joinSpeechRecognitionResults(event.results));
        };
        recognitionRef.current = recognition;
        recognition.start();
    }, [abort, language, onTranscript]);

    return {
        supported: Boolean(getSpeechRecognitionConstructor()),
        listening,
        error,
        start,
        stop,
        abort,
    };
}

export function useInterviewSpeechSynthesis() {
    const [speaking, setSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const stop = useCallback(() => {
        if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
        setSpeaking(false);
    }, []);

    useEffect(() => stop, [stop]);

    const speak = useCallback(
        (
            text: string,
            options?: {
                voiceName?: string | null;
                rate?: number;
                volume?: number;
            },
        ) => {
            if (typeof window === 'undefined' || !window.speechSynthesis) {
                setError('Trình duyệt này chưa hỗ trợ phát giọng nói.');
                return false;
            }
            stop();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = options?.rate ?? 1;
            utterance.volume = options?.volume ?? 1;
            const voice = resolveVietnameseSpeechVoice(
                window.speechSynthesis.getVoices(),
                options?.voiceName,
            );
            if (voice) utterance.voice = voice;
            utterance.onstart = () => {
                setError(null);
                setSpeaking(true);
            };
            utterance.onend = () => setSpeaking(false);
            utterance.onerror = () => {
                setSpeaking(false);
                setError(
                    'Không thể phát câu hỏi. Nội dung chữ vẫn được giữ nguyên.',
                );
            };
            window.speechSynthesis.speak(utterance);
            return true;
        },
        [stop],
    );

    return { speaking, error, speak, stop };
}
