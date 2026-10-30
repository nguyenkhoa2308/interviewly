import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AdaptiveInterviewerService } from './adaptive/adaptive-interviewer.service';
import { AuthModule } from '../auth/auth.module';
import { InterviewContextService } from './interview-context.service';
import { InterviewController } from './interview.controller';
import { InterviewRuntimeService } from './interview-runtime.service';
import { InterviewPlanStaleRecoveryService } from './interview-plan-stale-recovery.service';
import { InterviewService } from './interview.service';
import { InterviewHistoryService } from './interview-history.service';
import { InterviewPlannerService } from './planning/interview-planner.service';
import { InterviewEvaluationScoringService } from './evaluation/interview-evaluation-scoring.service';
import { InterviewEvaluationService } from './evaluation/interview-evaluation.service';
import { InterviewEvaluatorService } from './evaluation/interview-evaluator.service';

@Module({
    imports: [AuthModule, AiModule],
    controllers: [InterviewController],
    providers: [
        InterviewService,
        InterviewHistoryService,
        InterviewRuntimeService,
        AdaptiveInterviewerService,
        InterviewContextService,
        InterviewPlannerService,
        InterviewPlanStaleRecoveryService,
        InterviewEvaluatorService,
        InterviewEvaluationScoringService,
        InterviewEvaluationService,
    ],
})
export class InterviewModule {}
