import {
    type CanActivate,
    type ExecutionContext,
    type INestApplication,
    UnauthorizedException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

describe('OnboardingController', () => {
    const userId = '9a56bf83-dc31-48d7-8c5d-99ab02dc6ce2';
    const onboarding = {
        onboardingCompletedAt: null,
        fullName: 'Nguyễn Đức Khoa',
        avatarUrl: null,
        preferences: {
            targetRole: 'Frontend Developer',
            experienceLevel: 'JUNIOR',
            yearsOfExperience: 1.5,
            interviewGoals: ['GET_A_JOB'],
            customInterviewGoal: null,
            learningStyle: 'LEARN_BY_DOING',
            contentPreferences: ['FRONTEND_FRAMEWORKS'],
            sessionLength: 30,
            defaultDifficulty: 'MEDIUM',
            feedbackDetail: 'STANDARD',
        },
    };
    const onboardingService = {
        getOnboarding: jest.fn<OnboardingService['getOnboarding']>(),
        completeOnboarding: jest.fn<OnboardingService['completeOnboarding']>(),
        skipOnboarding: jest.fn<OnboardingService['skipOnboarding']>(),
    };
    const authGuard: CanActivate = {
        canActivate: jest.fn((context: ExecutionContext) => {
            context.switchToHttp().getRequest().user = {
                id: userId,
                email: 'khoa@example.com',
                role: 'USER',
            };
            return true;
        }),
    };
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [OnboardingController],
            providers: [
                {
                    provide: OnboardingService,
                    useValue: onboardingService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(authGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (authGuard.canActivate as jest.Mock).mockImplementation(
            (context: ExecutionContext) => {
                context.switchToHttp().getRequest().user = {
                    id: userId,
                    email: 'khoa@example.com',
                    role: 'USER',
                };
                return true;
            },
        );
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /api/v1/onboarding returns the authenticated user onboarding', async () => {
        onboardingService.getOnboarding.mockResolvedValue(onboarding as never);

        await request(app.getHttpServer())
            .get('/api/v1/onboarding')
            .expect(200)
            .expect(onboarding);

        expect(onboardingService.getOnboarding).toHaveBeenCalledWith(userId);
    });

    it('GET /api/v1/onboarding rejects an unauthenticated request', async () => {
        (authGuard.canActivate as jest.Mock).mockImplementation(() => {
            throw new UnauthorizedException();
        });

        await request(app.getHttpServer())
            .get('/api/v1/onboarding')
            .expect(401);

        expect(onboardingService.getOnboarding).not.toHaveBeenCalled();
    });
});
