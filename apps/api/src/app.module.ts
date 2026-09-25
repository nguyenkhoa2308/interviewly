import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CvModule } from './modules/cv/cv.module';
import { JobDescriptionModule } from './modules/job-description/job-description.module';
import { CvJdMatchModule } from './modules/cv-jd-match/cv-jd-match.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            validate: validateEnv,
        }),
        ThrottlerModule.forRoot([
            { name: 'default', ttl: minutes(1), limit: 120 },
        ]),
        HealthModule,
        PrismaModule,
        AuthModule,
        OnboardingModule,
        UsersModule,
        SettingsModule,
        CvModule,
        JobDescriptionModule,
        CvJdMatchModule,
    ],
    controllers: [AppController],
    providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
