import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AdaptiveInterviewerService } from './adaptive/adaptive-interviewer.service';
import { AuthModule } from '../auth/auth.module';
import { InterviewContextService } from './interview-context.service';
import { InterviewController } from './interview.controller';
import { InterviewRuntimeService } from './interview-runtime.service';
import { InterviewPlanStaleRecoveryService } from './interview-plan-stale-recovery.service';
import { InterviewService } from './interview.service';
import { InterviewPlannerService } from './planning/interview-planner.service';

@Module({
    imports: [AuthModule, AiModule],
    controllers: [InterviewController],
    providers: [
        InterviewService,
        InterviewRuntimeService,
        AdaptiveInterviewerService,
        InterviewContextService,
        InterviewPlannerService,
        InterviewPlanStaleRecoveryService,
    ],
})
export class InterviewModule {}
