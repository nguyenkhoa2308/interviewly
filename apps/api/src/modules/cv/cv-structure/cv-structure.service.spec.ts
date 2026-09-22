import { jest } from '@jest/globals';

import type { AiProvider } from '../../ai/ai-provider.types';
import { CvStructureService } from './cv-structure.service';

describe('CvStructureService', () => {
    const generateStructured = jest.fn<AiProvider['generateStructured']>();
    const provider: AiProvider = {
        providerName: 'TEST',
        modelName: 'test-model',
        generateStructured,
    };
    const service = new CvStructureService(provider);

    beforeEach(() => jest.clearAllMocks());

    it('preserves custom section titles and their order', async () => {
        generateStructured.mockResolvedValue({
            modelName: 'test-model',
            data: {
                header: {
                    name: 'Nguyen Duc Khoa',
                    headline: 'Backend Developer',
                    contacts: ['khoa@example.com'],
                },
                sections: [
                    {
                        title: 'MY JOURNEY',
                        items: [
                            {
                                title: 'Interviewly',
                                subtitle: 'Backend Developer',
                                dateText: '2025 - Present',
                                lines: [
                                    {
                                        type: 'BULLET',
                                        content: 'Built secure APIs.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        title: 'OPEN SOURCE',
                        items: [],
                    },
                ],
            },
        });

        const result = await service.normalize(
            'Nguyen Duc Khoa\nMY JOURNEY\nInterviewly',
        );

        expect(result?.sections.map((section) => section.title)).toEqual([
            'MY JOURNEY',
            'OPEN SOURCE',
        ]);
        expect(generateStructured).toHaveBeenCalledTimes(1);
    });

    it('returns null when provider output violates the schema', async () => {
        generateStructured.mockResolvedValue({
            modelName: 'test-model',
            data: { invented: true },
        });

        await expect(
            service.normalize('Valid extracted CV text'),
        ).resolves.toBe(null);
    });

    it('returns null instead of failing CV upload when AI is unavailable', async () => {
        generateStructured.mockRejectedValue(new Error('provider unavailable'));

        await expect(
            service.normalize('Valid extracted CV text'),
        ).resolves.toBe(null);
    });
});
