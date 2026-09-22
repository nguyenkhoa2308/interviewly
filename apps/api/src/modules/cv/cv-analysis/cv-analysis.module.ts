import { Module } from '@nestjs/common';

import { AiModule } from '../../ai/ai.module';
import { CvAnalyzerService } from './cv-analyzer.service';
import { CvAnalysisService } from './cv-analysis.service';

@Module({
    imports: [AiModule],
    providers: [CvAnalyzerService, CvAnalysisService],
    exports: [CvAnalyzerService, CvAnalysisService],
})
export class CvAnalysisModule {}
