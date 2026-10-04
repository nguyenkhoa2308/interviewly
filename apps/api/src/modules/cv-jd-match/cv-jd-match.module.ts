import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { CvJdMatchController } from './cv-jd-match.controller';
import { CvJdMatchService } from './cv-jd-match.service';
import { CvJdMatchStaleRecoveryService } from './cv-jd-match-stale-recovery.service';
import { CvJdMatcherService } from './matching/cv-jd-matcher.service';

@Module({
    imports: [AuthModule, AiModule],
    controllers: [CvJdMatchController],
    providers: [
        CvJdMatchService,
        CvJdMatcherService,
        CvJdMatchStaleRecoveryService,
    ],
})
export class CvJdMatchModule {}
