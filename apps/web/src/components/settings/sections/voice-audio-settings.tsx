'use client';

import {
    AudioLines,
    MessageSquareText,
    Mic2,
    Save,
    Volume2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    ComingSoon,
    SettingsSegmentedControl,
    SettingsSlider,
    SettingsToggle,
} from '@/components/settings/settings-controls';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { Input } from '@/components/ui/input';
import { useUpdateSettings } from '@/hooks/settings';
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
    const speechSpeed = draftSpeechSpeed ?? data.speechSpeed;
    const volume = draftVolume ?? data.volume;

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
                description="Danh mục giọng đọc sẽ được bổ sung khi tích hợp nhà cung cấp."
                icon={Mic2}
            >
                <div className="relative">
                    <Input
                        aria-label="Giọng đọc"
                        value={data.voiceName ?? 'Chưa chọn giọng đọc'}
                        disabled
                        className="h-11 rounded-xl bg-white pr-28 disabled:opacity-100"
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2">
                        <ComingSoon />
                    </span>
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
