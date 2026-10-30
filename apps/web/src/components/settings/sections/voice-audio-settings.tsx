'use client';

import {
    AudioLines,
    MessageSquareText,
    Mic2,
    Play,
    Save,
    Volume2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    SettingsSegmentedControl,
    SettingsSlider,
    SettingsToggle,
} from '@/components/settings/settings-controls';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUpdateSettings } from '@/hooks/settings';
import {
    isVietnameseSpeechVoice,
    resolveVietnameseSpeechVoice,
} from '@/lib/interview-voice';
import type {
    InteractionMode,
    VoiceAndAudioSettings as VoiceAndAudioData,
} from '@/types/settings';

const interactionOptions = [
    { value: 'TEXT', label: 'Văn bản' },
    { value: 'VOICE', label: 'Giọng nói' },
] as const;

export function VoiceAudioSettings({ data }: { data: VoiceAndAudioData }) {
    const updateSettings = useUpdateSettings();
    const [pendingField, setPendingField] = useState<
        keyof VoiceAndAudioData | null
    >(null);
    const [draftSpeechSpeed, setDraftSpeechSpeed] = useState<number | null>(
        null,
    );
    const [draftVolume, setDraftVolume] = useState<number | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [previewingVoice, setPreviewingVoice] = useState(false);
    const speechSpeed = draftSpeechSpeed ?? data.speechSpeed;
    const volume = draftVolume ?? data.volume;
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const loadVoices = () => {
            const uniqueVoices = Array.from(
                new Map(
                    window.speechSynthesis
                        .getVoices()
                        .filter(isVietnameseSpeechVoice)
                        .map((voice) => [voice.name, voice]),
                ).values(),
            ).sort((left, right) => left.name.localeCompare(right.name));
            setVoices(uniqueVoices);
        };

        loadVoices();
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
        return () => {
            window.speechSynthesis.removeEventListener(
                'voiceschanged',
                loadVoices,
            );
            window.speechSynthesis.cancel();
        };
    }, []);

    const previewVoice = () => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
            'Xin chào, tôi sẽ đồng hành cùng bạn trong buổi phỏng vấn hôm nay.',
        );
        const selectedVoice = resolveVietnameseSpeechVoice(
            voices,
            data.voiceName,
        );
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = 'vi-VN';
        utterance.rate = speechSpeed;
        utterance.volume = volume;
        utterance.onend = () => setPreviewingVoice(false);
        utterance.onerror = () => setPreviewingVoice(false);
        setPreviewingVoice(true);
        window.speechSynthesis.speak(utterance);
    };

    const updateVoiceSetting = async <K extends keyof VoiceAndAudioData>(
        field: K,
        value: VoiceAndAudioData[K],
    ) => {
        if (pendingField || data[field] === value) return;

        setPendingField(field);
        try {
            await updateSettings.mutateAsync({
                voiceAndAudio: { [field]: value },
            });
        } catch {
            toast.error('Không thể lưu tùy chọn giọng nói', {
                description:
                    'Thay đổi chưa được lưu. Vui lòng kiểm tra kết nối và thử lại.',
            });
        } finally {
            if (field === 'speechSpeed') setDraftSpeechSpeed(null);
            if (field === 'volume') setDraftVolume(null);
            setPendingField(null);
        }
    };

    return (
        <SettingsSection
            title="Giọng nói và âm thanh"
            description="Chuẩn bị trải nghiệm luyện phỏng vấn bằng giọng nói."
            icon={Mic2}
        >
            <SettingsRow
                label="Chế độ tương tác mặc định"
                description="Chọn cách bạn muốn tương tác khi bắt đầu buổi mới."
                icon={MessageSquareText}
            >
                <SettingsSegmentedControl
                    label="Chế độ tương tác mặc định"
                    value={data.defaultInteractionMode}
                    options={interactionOptions}
                    disabled={pendingField === 'defaultInteractionMode'}
                    loading={pendingField === 'defaultInteractionMode'}
                    onValueChange={(value) =>
                        void updateVoiceSetting(
                            'defaultInteractionMode',
                            value as InteractionMode,
                        )
                    }
                />
            </SettingsRow>
            <SettingsRow
                label="Giọng đọc"
                description="Chọn giọng có sẵn trên thiết bị và nghe thử trước khi phỏng vấn."
                icon={Mic2}
            >
                <div className="flex w-full items-center gap-2">
                    <Select
                        value={
                            voices.some(
                                (voice) => voice.name === data.voiceName,
                            )
                                ? (data.voiceName ?? '__default__')
                                : '__default__'
                        }
                        disabled={pendingField === 'voiceName'}
                        onValueChange={(value) =>
                            void updateVoiceSetting(
                                'voiceName',
                                value === '__default__' ? null : value,
                            )
                        }
                    >
                        <SelectTrigger
                            className="min-w-0 flex-1 bg-white"
                            aria-label="Giọng đọc"
                        >
                            <SelectValue placeholder="Chọn giọng đọc" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__default__">
                                Giọng tiếng Việt mặc định
                            </SelectItem>
                            {voices.map((voice) => (
                                <SelectItem key={voice.name} value={voice.name}>
                                    {voice.name} · {voice.lang}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 rounded-xl font-bold"
                        disabled={previewingVoice}
                        onClick={previewVoice}
                    >
                        <Play className="size-4" />
                        <span className="hidden sm:inline">Nghe thử</span>
                    </Button>
                </div>
            </SettingsRow>
            <SettingsRow
                label="Tốc độ giọng nói"
                description="Điều chỉnh nhịp đọc từ 0.5 đến 2 lần tốc độ chuẩn."
                icon={AudioLines}
            >
                <SettingsSlider
                    label="Tốc độ giọng nói"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={speechSpeed}
                    output={`${speechSpeed}x`}
                    disabled={pendingField === 'speechSpeed'}
                    onValueChange={setDraftSpeechSpeed}
                    onValueCommit={() =>
                        void updateVoiceSetting('speechSpeed', speechSpeed)
                    }
                />
            </SettingsRow>
            <SettingsRow
                label="Âm lượng"
                description="Mức âm lượng mặc định cho phần giọng nói của AI."
                icon={Volume2}
            >
                <SettingsSlider
                    label="Âm lượng"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    output={`${Math.round(volume * 100)}%`}
                    disabled={pendingField === 'volume'}
                    onValueChange={setDraftVolume}
                    onValueCommit={() =>
                        void updateVoiceSetting('volume', volume)
                    }
                />
            </SettingsRow>
            <SettingsRow
                layout="inline"
                label="Lưu âm thanh phỏng vấn"
                description="Cho phép lưu bản ghi âm để bạn nghe lại sau buổi luyện tập."
                icon={Save}
            >
                <SettingsToggle
                    label="Lưu âm thanh phỏng vấn"
                    checked={data.saveInterviewAudio}
                    disabled={pendingField === 'saveInterviewAudio'}
                    loading={pendingField === 'saveInterviewAudio'}
                    onCheckedChange={(checked) =>
                        void updateVoiceSetting('saveInterviewAudio', checked)
                    }
                />
            </SettingsRow>
        </SettingsSection>
    );
}
