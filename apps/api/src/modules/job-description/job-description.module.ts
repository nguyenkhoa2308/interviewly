import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { JdAnalyzerService } from './jd-analysis/jd-analyzer.service';
import { JobDescriptionController } from './job-description.controller';
import { JobDescriptionService } from './job-description.service';

@Module({
    imports: [AuthModule, AiModule],
    controllers: [JobDescriptionController],
    providers: [JobDescriptionService, JdAnalyzerService],
})
export class JobDescriptionModule {}
