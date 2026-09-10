export type Language = 'VI' | 'EN';
export type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'ADAPTIVE';
export type InterviewType =
    'HR' | 'BEHAVIORAL' | 'TECHNICAL' | 'CODING' | 'SYSTEM_DESIGN' | 'FULL';
export type InterviewerStyle = 'FRIENDLY' | 'PROFESSIONAL' | 'STRICT';
export type LearningStyle =
    'LEARN_BY_DOING' | 'LEARN_BY_READING' | 'LEARN_BY_WATCHING' | 'MIXED';
export type ContentPreference =
    | 'DATA_STRUCTURES_ALGORITHMS'
    | 'SYSTEM_DESIGN'
    | 'FRONTEND_FRAMEWORKS'
    | 'BEHAVIORAL_QUESTIONS'
    | 'CODING_CHALLENGES'
    | 'RESUME_PORTFOLIO';
export type FeedbackDetail = 'CONCISE' | 'STANDARD' | 'DETAILED';
export type InteractionMode = 'TEXT' | 'VOICE';
export type SettingsDurationMinutes = 15 | 30 | 45 | 60;

export interface GeneralSettings {
    preferredLanguage: Language;
    theme: Theme;
    timezone: string | null;
}

export interface InterviewPreferencesSettings {
    defaultDifficulty: Difficulty | null;
    defaultInterviewType: InterviewType | null;
    interviewerStyle: InterviewerStyle | null;
    defaultDurationMinutes: SettingsDurationMinutes;
}

export interface LearningAndFeedbackSettings {
    learningStyle: LearningStyle | null;
    contentPreferences: ContentPreference[];
    feedbackDetail: FeedbackDetail | null;
}

export interface VoiceAndAudioSettings {
    defaultInteractionMode: InteractionMode;
    voiceName: string | null;
    speechSpeed: number;
    volume: number;
    saveInterviewAudio: boolean;
}

export interface Settings {
    general: GeneralSettings;
    interviewPreferences: InterviewPreferencesSettings;
    learningAndFeedback: LearningAndFeedbackSettings;
    voiceAndAudio: VoiceAndAudioSettings;
}

export interface UpdateSettingsPayload {
    general?: Partial<GeneralSettings>;
    interviewPreferences?: Partial<InterviewPreferencesSettings>;
    learningAndFeedback?: Partial<LearningAndFeedbackSettings>;
    voiceAndAudio?: Partial<VoiceAndAudioSettings>;
}
