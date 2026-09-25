import { Module } from '@nestjs/common';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { PDFParse } from 'pdf-parse';
import { PdfParserService } from './pdf-parser/pdf-parser.service';
import { PDF_PARSER_FACTORY } from './pdf-parser/pdf-parser.tokens';
import { CvAnalysisModule } from './cv-analysis/cv-analysis.module';
import { AiModule } from '../ai/ai.module';
import { CvStructureService } from './cv-structure/cv-structure.service';
import { CvStaleProcessingRecoveryService } from './cv-stale-processing-recovery.service';

@Module({
    imports: [AuthModule, StorageModule, AiModule, CvAnalysisModule],
    controllers: [CvController],
    providers: [
        {
            provide: PDF_PARSER_FACTORY,
            useValue: (buffer: Buffer) =>
                new PDFParse({ data: new Uint8Array(buffer) }),
        },
        PdfParserService,
        CvStructureService,
        CvStaleProcessingRecoveryService,
        CvService,
    ],
    exports: [CvService],
})
export class CvModule {}
