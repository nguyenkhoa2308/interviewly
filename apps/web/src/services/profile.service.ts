import { getData, patchData } from '@/lib/api-client';
import type {
    ExperienceLevel,
    InterviewGoal,
} from '@/services/onboarding.service';

export interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    emailVerifiedAt: string | null;
    targetRole: string | null;
    experienceLevel: ExperienceLevel | null;
    yearsOfExperience: number | null;
    interviewGoals: InterviewGoal[];
    customInterviewGoal: string | null;
}

export interface UpdateProfileRequest {
    fullName?: string;
    targetRole?: string | null;
    experienceLevel?: ExperienceLevel | null;
    yearsOfExperience?: number | null;
    interviewGoals?: InterviewGoal[];
    customInterviewGoal?: string | null;
}

interface ProfileResponse {
    success: true;
    data: UserProfile;
}

export async function getProfile(): Promise<UserProfile> {
    const response = await getData<ProfileResponse>('/profile');
    return response.data;
}

export async function updateProfile(
    data: UpdateProfileRequest,
): Promise<UserProfile> {
    const response = await patchData<ProfileResponse>('/profile', data);
    return response.data;
}
