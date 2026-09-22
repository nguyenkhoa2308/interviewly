import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import type { AiProvider } from '../../ai/ai-provider.types';
import { AI_PROVIDER } from '../../ai/ai.tokens';
import {
    buildCvStructurePrompt,
    CV_STRUCTURE_MAX_INPUT_CHARS,
    CV_STRUCTURE_SYSTEM_INSTRUCTION,
} from './cv-structure.prompt';
import {
    CV_STRUCTURE_RESPONSE_JSON_SCHEMA,
    CvStructuredContentSchema,
    type CvStructuredContent,
} from './cv-structure.schema';

const InputSchema = z.string().trim().min(1).max(CV_STRUCTURE_MAX_INPUT_CHARS);

@Injectable()
export class CvStructureService {
    private readonly logger = new Logger(CvStructureService.name);

    constructor(@Inject(AI_PROVIDER) private readonly aiProvider: AiProvider) {}

    async normalize(
        extractedText: string,
    ): Promise<CvStructuredContent | null> {
        const input = InputSchema.safeParse(extractedText);
        if (!input.success) return null;

        try {
            const response = await this.aiProvider.generateStructured({
                systemInstruction: CV_STRUCTURE_SYSTEM_INSTRUCTION,
                prompt: buildCvStructurePrompt(input.data),
                responseJsonSchema: CV_STRUCTURE_RESPONSE_JSON_SCHEMA,
            });
            const result = CvStructuredContentSchema.safeParse(response.data);

            if (!result.success) {
                this.logger.warn(
                    'AI trả về cấu trúc CV không đúng schema; dùng raw text fallback.',
                );
                return null;
            }

            return result.data;
        } catch {
            this.logger.warn(
                'Không thể chuẩn hóa cấu trúc CV; dùng raw text fallback.',
            );
            return null;
        }
    }
}
