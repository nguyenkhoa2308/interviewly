import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

import { GeminiProvider } from './gemini/gemini.provider';
import { AI_PROVIDER, GEMINI_CLIENT } from './ai.tokens';

@Module({
    providers: [
        {
            provide: GEMINI_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                new GoogleGenAI({
                    apiKey: configService.getOrThrow<string>('GEMINI_API_KEY'),
                }),
        },
        GeminiProvider,
        { provide: AI_PROVIDER, useExisting: GeminiProvider },
    ],
    exports: [AI_PROVIDER],
})
export class AiModule {}
