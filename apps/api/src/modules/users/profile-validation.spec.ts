import {
    ValidationPipe,
    type CanActivate,
    type ExecutionContext,
    type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';

import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import {
    ExperienceLevel,
    InterviewGoal,
    Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { ProfileController } from './profile.controller';
import { AvatarImageService } from './services/avatar-image.service';
import { UsersService } from './users.service';

const PROFILE_ENDPOINT = '/api/v1/profile';
const USER_ID = '00000000-0000-0000-0000-000000000001';

interface PreferenceState {
    targetRole: string | null;
    experienceLevel: ExperienceLevel | null;
    yearsOfExperience: Prisma.Decimal | null;
    interviewGoals: InterviewGoal[];
    customInterviewGoal: string | null;
}

interface UserState {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    emailVerifiedAt: Date | null;
    preference: PreferenceState | null;
}

class TestAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest().user = {
            id: USER_ID,
            email: 'profile-test@example.com',
            role: 'USER',
        };
        return true;
    }
}

function initialPreference(): PreferenceState {
    return {
        targetRole: 'Backend Developer',
        experienceLevel: ExperienceLevel.JUNIOR,
        yearsOfExperience: new Prisma.Decimal('1.5'),
        interviewGoals: [InterviewGoal.GET_A_JOB],
        customInterviewGoal: null,
    };
}

function initialUser(): UserState {
    return {
        id: USER_ID,
        fullName: 'Nguyễn Đức Khoa',
        email: 'profile-test@example.com',
        avatarUrl: null,
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        preference: initialPreference(),
    };
}

describe('PATCH /profile validation', () => {
    let app: INestApplication;
    let state: UserState;

    const userFindUnique = jest.fn<() => Promise<UserState | null>>();
    const userUpdate =
        jest.fn<
            (args: { data: { fullName?: string } }) => Promise<UserState>
        >();
    const preferenceUpsert =
        jest.fn<
            (args: {
                create: Record<string, unknown>;
                update: Record<string, unknown>;
            }) => Promise<PreferenceState>
        >();
    const transaction =
        jest.fn<
            (
                callback: (
                    client: typeof transactionClient,
                ) => Promise<unknown>,
            ) => Promise<unknown>
        >();

    const transactionClient = {
        user: {
            findUnique: userFindUnique,
            update: userUpdate,
        },
        userPreference: {
            upsert: preferenceUpsert,
        },
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [ProfileController],
            providers: [
                UsersService,
                {
                    provide: PrismaService,
                    useValue: { $transaction: transaction },
                },
                { provide: AvatarImageService, useValue: {} },
                { provide: StorageService, useValue: {} },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useClass(TestAuthGuard)
            .compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());
        app.useGlobalInterceptors(new ResponseInterceptor());
        await app.init();
    });

    beforeEach(() => {
        state = initialUser();
        jest.clearAllMocks();

        userFindUnique.mockImplementation(async () => state);
        userUpdate.mockImplementation(async ({ data }) => {
            state = { ...state, ...data };
            return state;
        });
        preferenceUpsert.mockImplementation(async ({ create, update }) => {
            const input = state.preference ? update : create;
            const years = input.yearsOfExperience;
            const normalizedYears =
                typeof years === 'number' ? new Prisma.Decimal(years) : years;

            state = {
                ...state,
                preference: {
                    ...(state.preference ?? initialPreference()),
                    ...input,
                    ...(years !== undefined && {
                        yearsOfExperience: normalizedYears,
                    }),
                } as PreferenceState,
            };
            return state.preference!;
        });
        transaction.mockImplementation(async (callback) =>
            callback(transactionClient),
        );
    });

    afterAll(async () => app.close());

    const patchProfile = (body: Record<string, unknown>) =>
        request(app.getHttpServer()).patch(PROFILE_ENDPOINT).send(body);

    describe('fullName', () => {
        it('1. accepts a valid value', async () => {
            const response = await patchProfile({ fullName: 'John Doe' });
            expect(response.status).toBe(200);
            expect(state.fullName).toBe('John Doe');
        });

        it('2. trims before saving', async () => {
            await patchProfile({ fullName: '  John Doe  ' }).expect(200);
            expect(state.fullName).toBe('John Doe');
        });

        it('3. rejects fewer than 2 characters', async () => {
            await patchProfile({ fullName: 'J' }).expect(400);
        });

        it('4. accepts exactly 150 characters', async () => {
            await patchProfile({ fullName: 'a'.repeat(150) }).expect(200);
            expect(state.fullName).toHaveLength(150);
        });

        it('5. rejects more than 150 characters', async () => {
            await patchProfile({ fullName: 'a'.repeat(151) }).expect(400);
        });

        it('6. rejects null before calling the service', async () => {
            await patchProfile({ fullName: null }).expect(400);
            expect(transaction).not.toHaveBeenCalled();
        });

        it('7. rejects an empty string', async () => {
            await patchProfile({ fullName: '' }).expect(400);
        });

        it('8. rejects whitespace only', async () => {
            await patchProfile({ fullName: '   ' }).expect(400);
        });
    });

    describe('targetRole', () => {
        it('9. accepts a valid value', async () => {
            await patchProfile({ targetRole: 'Frontend Developer' }).expect(
                200,
            );
            expect(state.preference?.targetRole).toBe('Frontend Developer');
        });

        it('10. trims before saving', async () => {
            await patchProfile({ targetRole: '  Frontend Developer  ' }).expect(
                200,
            );
            expect(state.preference?.targetRole).toBe('Frontend Developer');
        });

        it('11. clears with null', async () => {
            await patchProfile({ targetRole: null }).expect(200);
            expect(state.preference?.targetRole).toBeNull();
        });

        it.each([
            ['12. empty', ''],
            ['13. whitespace', '   '],
        ])('rejects %s value', async (_label, targetRole) => {
            await patchProfile({ targetRole }).expect(400);
        });

        it('14. rejects more than 100 characters', async () => {
            await patchProfile({ targetRole: 'a'.repeat(101) }).expect(400);
        });
    });

    describe('experienceLevel', () => {
        it('15. accepts a valid enum', async () => {
            await patchProfile({
                experienceLevel: ExperienceLevel.SENIOR,
            }).expect(200);
            expect(state.preference?.experienceLevel).toBe(
                ExperienceLevel.SENIOR,
            );
        });

        it('16. rejects an invalid enum', async () => {
            await patchProfile({ experienceLevel: 'MASTER' }).expect(400);
        });

        it('17. clears with null', async () => {
            await patchProfile({ experienceLevel: null }).expect(200);
            expect(state.preference?.experienceLevel).toBeNull();
        });
    });

    describe('yearsOfExperience', () => {
        it.each([
            ['18. zero', 0, 0],
            ['19. upper boundary', 99.9, 99.9],
            ['22. decimal', 2.5, 2.5],
            ['24. numeric string', '2', 2],
        ])('accepts %s', async (_label, input, expected) => {
            await patchProfile({ yearsOfExperience: input }).expect(200);
            expect(state.preference?.yearsOfExperience?.toNumber()).toBe(
                expected,
            );
        });

        it.each([
            ['20. over maximum', 100],
            ['21. negative', -0.1],
            ['23. more than one decimal place', 2.55],
            ['27. invalid numeric input', 'not-a-number'],
        ])('rejects %s', async (_label, yearsOfExperience) => {
            await patchProfile({ yearsOfExperience }).expect(400);
        });

        it.each([
            ['25. empty', ''],
            ['26. whitespace', '   '],
        ])('normalizes %s to null', async (_label, yearsOfExperience) => {
            await patchProfile({ yearsOfExperience }).expect(200);
            expect(state.preference?.yearsOfExperience).toBeNull();
        });
    });

    describe('interviewGoals', () => {
        it('28. accepts valid goals', async () => {
            const goals = [
                InterviewGoal.GET_A_JOB,
                InterviewGoal.IMPROVE_SKILLS,
            ];
            await patchProfile({ interviewGoals: goals }).expect(200);
            expect(state.preference?.interviewGoals).toEqual(goals);
        });

        it('29. clears goals with an empty array', async () => {
            await patchProfile({ interviewGoals: [] }).expect(200);
            expect(state.preference?.interviewGoals).toEqual([]);
            expect(state.preference?.customInterviewGoal).toBeNull();
        });

        it('30. rejects duplicate goals', async () => {
            await patchProfile({
                interviewGoals: [
                    InterviewGoal.GET_A_JOB,
                    InterviewGoal.GET_A_JOB,
                ],
            }).expect(400);
        });

        it('31. rejects an invalid enum', async () => {
            await patchProfile({ interviewGoals: ['UNKNOWN'] }).expect(400);
        });

        it('32. rejects null before calling the service', async () => {
            await patchProfile({ interviewGoals: null }).expect(400);
            expect(transaction).not.toHaveBeenCalled();
        });
    });

    describe('OTHER and customInterviewGoal', () => {
        it('33. saves a trimmed custom goal with OTHER', async () => {
            await patchProfile({
                interviewGoals: [InterviewGoal.OTHER],
                customInterviewGoal: '  Improve communication  ',
            }).expect(200);
            expect(state.preference?.customInterviewGoal).toBe(
                'Improve communication',
            );
        });

        it.each([
            ['34. empty', ''],
            ['35. whitespace', '   '],
            ['36. null', null],
        ])('requires custom goal for OTHER: %s', async (_label, value) => {
            const response = await patchProfile({
                interviewGoals: [InterviewGoal.OTHER],
                customInterviewGoal: value,
            });
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe(
                'CUSTOM_INTERVIEW_GOAL_REQUIRED',
            );
        });

        it('37. preserves existing custom goal when patching fullName', async () => {
            state.preference = {
                ...initialPreference(),
                interviewGoals: [InterviewGoal.OTHER],
                customInterviewGoal: 'Existing custom goal',
            };
            await patchProfile({ fullName: 'New Name' }).expect(200);
            expect(state.preference.customInterviewGoal).toBe(
                'Existing custom goal',
            );
            expect(preferenceUpsert).not.toHaveBeenCalled();
        });

        it('38. clears custom goal when OTHER is removed', async () => {
            state.preference = {
                ...initialPreference(),
                interviewGoals: [InterviewGoal.OTHER],
                customInterviewGoal: 'Existing custom goal',
            };
            await patchProfile({
                interviewGoals: [InterviewGoal.GET_A_JOB],
            }).expect(200);
            expect(state.preference.customInterviewGoal).toBeNull();
        });

        it.each([
            ['39. custom text', 'Something'],
            ['40. empty custom', ''],
        ])(
            'normalizes custom to null without OTHER: %s',
            async (_label, value) => {
                await patchProfile({ customInterviewGoal: value }).expect(200);
                expect(state.preference?.customInterviewGoal).toBeNull();
            },
        );
    });

    describe('PATCH semantics', () => {
        it('41. treats an empty object as an absolute no-op', async () => {
            const response = await patchProfile({});
            expect(response.status).toBe(200);
            expect(userUpdate).not.toHaveBeenCalled();
            expect(preferenceUpsert).not.toHaveBeenCalled();
            expect(userFindUnique).toHaveBeenCalledTimes(1);
        });

        it('42. preserves omitted fields', async () => {
            await patchProfile({ fullName: 'New Name' }).expect(200);
            expect(state.preference).toEqual(initialPreference());
        });
    });

    describe('read-only fields', () => {
        it.each([
            ['43. email', 'email', 'new@example.com'],
            ['44. avatarUrl', 'avatarUrl', 'https://example.com/avatar.webp'],
            ['45. role', 'role', 'ADMIN'],
            ['46. id', 'id', '00000000-0000-0000-0000-000000000002'],
        ])('rejects %s', async (_label, field, value) => {
            await patchProfile({ [field]: value }).expect(400);
            expect(transaction).not.toHaveBeenCalled();
        });
    });
});
