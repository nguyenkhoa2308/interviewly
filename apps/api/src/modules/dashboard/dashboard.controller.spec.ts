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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardRange } from './dto/dashboard-summary-query.dto';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    const summary = {
        overview: {
            cvs: { total: 0, ready: 0, trend: unchangedTrend() },
            jobDescriptions: {
                total: 0,
                analyzed: 0,
                trend: unchangedTrend(),
            },
            matches: {
                total: 0,
                completed: 0,
                averageScore: null,
                trend: unchangedTrend(),
            },
        },
        interviewSummary: {
            total: 0,
            draft: 0,
            ready: 0,
            inProgress: 0,
            completed: 0,
            averageScore: null,
            trend: unchangedTrend(),
        },
        performanceHistory: [],
        recentInterviews: [],
        recentActivity: [],
    };
    const dashboardService = {
        getSummary: jest.fn<DashboardService['getSummary']>(),
    };
    const authGuard: CanActivate = {
        canActivate: jest.fn((context: ExecutionContext) => {
            context.switchToHttp().getRequest().user = {
                id: userId,
                email: 'dashboard@example.com',
                role: 'USER',
            };
            return true;
        }),
    };
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [DashboardController],
            providers: [
                { provide: DashboardService, useValue: dashboardService },
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
                    email: 'dashboard@example.com',
                    role: 'USER',
                };
                return true;
            },
        );
        dashboardService.getSummary.mockResolvedValue(summary);
    });

    afterAll(async () => {
        await app.close();
    });

    it('returns the global envelope at GET /api/v1/dashboard/summary', async () => {
        await request(app.getHttpServer())
            .get('/api/v1/dashboard/summary')
            .expect(200)
            .expect({ success: true, data: summary });

        expect(dashboardService.getSummary).toHaveBeenCalledWith(
            userId,
            DashboardRange.LAST_30_DAYS,
        );
    });

    it('passes a validated range to the service', async () => {
        await request(app.getHttpServer())
            .get('/api/v1/dashboard/summary?range=7d')
            .expect(200);

        expect(dashboardService.getSummary).toHaveBeenCalledWith(
            userId,
            DashboardRange.LAST_7_DAYS,
        );
    });

    it('rejects unsupported ranges and arbitrary ownership queries', async () => {
        await request(app.getHttpServer())
            .get('/api/v1/dashboard/summary?range=365d')
            .expect(400);
        await request(app.getHttpServer())
            .get('/api/v1/dashboard/summary?userId=another-user')
            .expect(400);

        expect(dashboardService.getSummary).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated requests', async () => {
        (authGuard.canActivate as jest.Mock).mockImplementation(() => {
            throw new UnauthorizedException();
        });

        await request(app.getHttpServer())
            .get('/api/v1/dashboard/summary')
            .expect(401);

        expect(dashboardService.getSummary).not.toHaveBeenCalled();
    });
});

function unchangedTrend() {
    return {
        currentPeriod: 0,
        previousPeriod: 0,
        percentageChange: 0,
        direction: 'UNCHANGED' as const,
    };
}
