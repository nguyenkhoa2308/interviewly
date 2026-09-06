import { getData, postData } from '@/lib/api-client';

export const experienceLevels = [
    'INTERN',
    'FRESHER',
    'JUNIOR',
    'MIDDLE',
    'SENIOR',
    'LEAD',
] as const;

export const interviewGoals = [
    'GET_A_JOB',
    'IMPROVE_SKILLS',
    'CRACK_TOP_COMPANIES',
    'SWITCH_CAREER',
    'BOOST_INTERVIEW_CONFIDENCE',
    'IMPROVE_RESUME',
    'PRACTICE_COMMUNICATION',
    'OTHER',
] as const;

export const learningStyles = [
    'LEARN_BY_DOING',
    'LEARN_BY_READING',
    'LEARN_BY_WATCHING',
    'MIXED',
] as const;

export const contentPreferences = [
    'DATA_STRUCTURES_ALGORITHMS',
    'SYSTEM_DESIGN',
    'FRONTEND_FRAMEWORKS',
    'BEHAVIORAL_QUESTIONS',
    'CODING_CHALLENGES',
    'RESUME_PORTFOLIO',
] as const;

export const difficulties = ['EASY', 'MEDIUM', 'HARD', 'ADAPTIVE'] as const;
export const feedbackDetails = ['CONCISE', 'STANDARD', 'DETAILED'] as const;

export type ExperienceLevel = (typeof experienceLevels)[number];
export type InterviewGoal = (typeof interviewGoals)[number];
export type LearningStyle = (typeof learningStyles)[number];
export type ContentPreference = (typeof contentPreferences)[number];
export type Difficulty = (typeof difficulties)[number];
export type FeedbackDetail = (typeof feedbackDetails)[number];

export interface OnboardingPreferences {
    targetRole: string | null;
    experienceLevel: ExperienceLevel | null;
    yearsOfExperience: number | null;
    interviewGoals: InterviewGoal[];
    customInterviewGoal: string | null;
    learningStyle: LearningStyle | null;
    contentPreferences: ContentPreference[];
    sessionLength: number | null;
    defaultDifficulty: Difficulty | null;
    feedbackDetail: FeedbackDetail | null;
}

export interface OnboardingData {
    onboardingCompletedAt: string | null;
    fullName: string;
    avatarUrl: string | null;
    preferences: OnboardingPreferences | null;
}

export interface OnboardingResponse {
    success: true;
    data: OnboardingData;
}

export interface CompleteOnboardingRequest {
    fullName?: string;
    avatarUrl?: string;
    targetRole?: string;
    experienceLevel?: ExperienceLevel;
    yearsOfExperience?: number;
    interviewGoals?: InterviewGoal[];
    customInterviewGoal?: string;
    learningStyle?: LearningStyle;
    contentPreferences?: ContentPreference[];
    sessionLength?: number;
    defaultDifficulty?: Difficulty;
    feedbackDetail?: FeedbackDetail;
}

export const getOnboarding = () => getData<OnboardingResponse>('/onboarding');

export const completeOnboarding = (data: CompleteOnboardingRequest) =>
    postData<OnboardingResponse>('/onboarding/complete', data);

export const skipOnboarding = () =>
    postData<OnboardingResponse>('/onboarding/skip');
