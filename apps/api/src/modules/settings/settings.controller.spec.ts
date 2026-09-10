import {
    type CanActivate,
    type ExecutionContext,
    type INestApplication,
    UnauthorizedException,
    ValidationPipe,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';

import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import type { AuthUser } from '../auth/types/auth-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsController', () => {
    const userId = '9a56bf83-dc31-48d7-8c5d-99ab02dc6ce2';
    const settings = {
        general: {
            preferredLanguage: 'VI',
            theme: 'SYSTEM',
            timezone: null,
        },
        interviewPreferences: {
            defaultDifficulty: null,
            defaultInterviewType: null,
            interviewerStyle: null,
            defaultDurationMinutes: 30,
        },
        learningAndFeedback: {
            learningStyle: null,
            contentPreferences: [],
            feedbackDetail: null,
        },
        voiceAndAudio: {
            defaultInteractionMode: 'TEXT',
            voiceName: null,
            speechSpeed: 1,
            volume: 1,
            saveInterviewAudio: false,
        },
    };
    const settingsService = {
        getSettings: jest.fn<SettingsService['getSettings']>(),
        updateSettings: jest.fn<SettingsService['updateSettings']>(),
    };
    const authGuard: CanActivate = {
        canActivate: jest.fn((context: ExecutionContext) => {
            context.switchToHttp().getRequest().user = {
                id: userId,
                email: 'settings@example.com',
                role: 'USER',
            };
            return true;
        }),
    };
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [SettingsController],
            providers: [
                { provide: SettingsService, useValue: settingsService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(authGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalInterceptors(new ResponseInterceptor());
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (authGuard.canActivate as jest.Mock).mockImplementation(
            (context: ExecutionContext) => {
                context.switchToHttp().getRequest().user = {
                    id: userId,
                    email: 'settings@example.com',
                    role: 'USER',
                };
                return true;
            },
        );
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /api/v1/settings returns the global response wrapper', async () => {
        settingsService.getSettings.mockResolvedValue(settings as never);

        await request(app.getHttpServer())
            .get('/api/v1/settings')
            .expect(200)
            .expect({ success: true, data: settings });

        expect(settingsService.getSettings).toHaveBeenCalledWith(userId);
    });

    it('PATCH /api/v1/settings uses only the authenticated user id', async () => {
        settingsService.updateSettings.mockResolvedValue(settings as never);

        await request(app.getHttpServer())
            .patch('/api/v1/settings')
            .send({ general: { theme: 'DARK' } })
            .expect(200)
            .expect({ success: true, data: settings });

        expect(settingsService.updateSettings).toHaveBeenCalledWith(userId, {
            general: { theme: 'DARK' },
        });
    });

    it.each(['get', 'patch'] as const)(
        '%s /api/v1/settings rejects unauthenticated access',
        async (method) => {
            (authGuard.canActivate as jest.Mock).mockImplementation(() => {
                throw new UnauthorizedException();
            });

            await request(app.getHttpServer())
                [method]('/api/v1/settings')
                .expect(401);

            expect(settingsService.getSettings).not.toHaveBeenCalled();
            expect(settingsService.updateSettings).not.toHaveBeenCalled();
        },
    );

    it('rejects an invalid PATCH before calling the service', async () => {
        await request(app.getHttpServer())
            .patch('/api/v1/settings')
            .send({ userId: 'another-user', general: { theme: 'BLUE' } })
            .expect(400);

        expect(settingsService.updateSettings).not.toHaveBeenCalled();
    });

    it('passes the authenticated id in direct controller calls', async () => {
        const controller = new SettingsController(
            settingsService as unknown as SettingsService,
        );
        const user = {
            id: 'authenticated-user',
            email: 'user@example.com',
            role: 'USER',
        } as AuthUser;
        const dto = { general: { theme: 'DARK' as const } };

        await controller.updateSettings(user, dto);

        expect(settingsService.updateSettings).toHaveBeenCalledWith(
            'authenticated-user',
            dto,
        );
    });
});
