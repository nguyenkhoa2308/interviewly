import { jest } from '@jest/globals';
import type { AiProvider } from '../../ai/ai-provider.types';
import {
    QuestionReviewBatchSchema,
    type InterviewEvaluationAiResult,
} from './interview-evaluation.schema';
import { InterviewEvaluatorService } from './interview-evaluator.service';

const turnId = '11111111-1111-4111-8111-111111111111';
const context = {
    preferredLanguage: 'VI' as const,
    interviewId: '22222222-2222-4222-8222-222222222222',
    sessionId: '33333333-3333-4333-8333-333333333333',
    interviewType: 'TECHNICAL',
    completedAt: '2026-10-11T00:00:00.000Z',
    historicalContext: {},
    targetRole: 'Backend Developer',
    targetLevel: 'JUNIOR',
    rubric: {},
    competencyMap: [
        {
            key: 'api',
            name: 'API',
            priority: 'KEY',
            expectedDepth: 'APPLICATION',
            evidenceNeeded: ['Xá»­ lÃ½ lá»—i API.'],
            probeAreas: ['HTTP'],
            sources: ['ROLE_BASELINE'],
        },
    ],
    turns: [
        {
            id: turnId,
            runtimeOrder: 1,
            rootPlannedQuestionKey: 'planned:1',
            parentTurnId: null,
            coveredByTurnId: null,
            origin: 'PLANNED_MAIN',
            questionType: 'TECHNICAL',
            topic: 'API',
            competencyKey: 'api',
            questionText: 'Báº¡n xá»­ lÃ½ lá»—i API tháº¿ nÃ o?',
            answerText: 'TÃ´i phÃ¢n loáº¡i lá»—i vÃ  retry cÃ³ giá»›i háº¡n.',
            probeType: 'MAIN_TARGET_LEVEL',
            scoringImpact: 'TARGET_LEVEL',
            assistanceLevel: 'NONE',
            adaptiveAction: null,
            coverageEvidence: null,
            answerAssessment: null,
        },
    ],
};

function validResult(): InterviewEvaluationAiResult {
    return {
        schemaVersion: 2,
        overallSummary: 'á»¨ng viÃªn cÃ³ báº±ng chá»©ng phÃ¹ há»£p.',
        demonstratedStrengths: ['Biáº¿t phÃ¢n loáº¡i lá»—i.'],
        competencies: [
            {
                competencyKey: 'api',
                name: 'API',
                priority: 'KEY',
                score: 8,
                coverageStatus: 'SUFFICIENT',
                confidence: 'HIGH',
                summary: 'CÃ³ hiá»ƒu biáº¿t thá»±c táº¿.',
                strengths: ['NÃªu Ä‘Æ°á»£c retry cÃ³ giá»›i háº¡n.'],
                weaknesses: [],
                evidenceTurnIds: [turnId],
            },
        ],
        diagnosticFindings: [],
        answerReviews: [
            {
                turnId,
                competencyKey: 'api',
                correctAspects: ['PhÃ¢n loáº¡i lá»—i.'],
                missingAspects: [],
                incorrectAspects: [],
                whyItMatters: 'GiÃºp há»‡ thá»‘ng á»•n Ä‘á»‹nh.',
                improvement:
                    'NÃªu rÃµ Ä‘iá»u kiá»‡n retry, backoff vÃ  giá»›i háº¡n sá»‘ láº§n thá»­.',
                exampleImprovedAnswer: null,
                reviewSections: [
                    {
                        type: 'CODE_EXAMPLE',
                        title: 'Ví dụ minh họa',
                        order: 1,
                        data: {
                            language: 'typescript',
                            code: 'await requestWithRetry();',
                            explanation:
                                'Ví dụ minh họa cách gọi API với cơ chế retry có kiểm soát.',
                            expectedBehavior:
                                'Chỉ thử lại lỗi tạm thời và dừng sau số lần giới hạn.',
                        },
                    },
                ],
            },
        ],
        recommendations: [],
        unassessedAreas: [],
        stretchAchievements: [],
    };
}

describe('InterviewEvaluatorService', () => {
    function createService(result: ReturnType<typeof validResult>) {
        const provider = {
            providerName: 'test',
            modelName: 'test-model',
            generateStructured: jest.fn().mockResolvedValue({
                data: result,
                modelName: 'test-model',
            }),
        } satisfies AiProvider;

        return {
            provider,
            service: new InterviewEvaluatorService(provider),
        };
    }
    it('accepts a complete evidence-linked report', async () => {
        const provider = {
            providerName: 'test',
            modelName: 'test-model',
            generateStructured: jest.fn().mockResolvedValue({
                data: validResult(),
                modelName: 'test-model',
            }),
        } satisfies AiProvider;
        const service = new InterviewEvaluatorService(provider);
        await expect(service.evaluate(context)).resolves.toMatchObject({
            result: { competencies: [{ competencyKey: 'api' }] },
        });
        expect(provider.generateStructured).toHaveBeenCalledWith(
            expect.objectContaining({ timeoutMs: 90_000 }),
        );
    });

    it('rejects negative findings supported only by bonus stretch evidence', async () => {
        const stretchContext = {
            ...context,
            turns: [
                {
                    ...context.turns[0],
                    probeType: 'STRETCH_PROBE',
                    scoringImpact: 'BONUS_ONLY',
                },
            ],
        };
        const result = validResult();
        result.diagnosticFindings.push({
            id: 'stretch-gap',
            competencyKey: 'api',
            subarea: 'NÃ¢ng cao',
            category: 'KNOWLEDGE_GAP',
            evidenceStatus: 'DEMONSTRATED_GAP',
            severity: 'HIGH',
            observation: 'ChÆ°a tráº£ lá»i Ä‘Æ°á»£c cÃ¢u vÆ°á»£t cáº¥p.',
            expectedUnderstanding: 'Kiáº¿n thá»©c vÆ°á»£t cáº¥p.',
            explanation: 'KhÃ´ng dÃ¹ng Ä‘á»ƒ trá»« Ä‘iá»ƒm.',
            evidenceTurnIds: [turnId],
            improvementAction: 'TÃ¬m hiá»ƒu thÃªm.',
            suggestedPractice: 'Thá»±c hÃ nh nÃ¢ng cao.',
        });
        const provider = {
            providerName: 'test',
            modelName: 'test-model',
            generateStructured: jest.fn().mockResolvedValue({
                data: result,
                modelName: 'test-model',
            }),
        } satisfies AiProvider;
        const service = new InterviewEvaluatorService(provider);
        await expect(service.evaluate(stretchContext)).rejects.toMatchObject({
            code: 'AI_SCHEMA_VALIDATION_FAILED',
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(3);
    });

    it('removes fabricated praise from a near-empty answer', async () => {
        const result = validResult();
        const provider = {
            providerName: 'test',
            modelName: 'test-model',
            generateStructured: jest.fn().mockResolvedValue({
                data: result,
                modelName: 'test-model',
            }),
        } satisfies AiProvider;
        const service = new InterviewEvaluatorService(provider);
        const shortAnswerContext = {
            ...context,
            turns: [{ ...context.turns[0], answerText: 'Xin chao' }],
        };

        await expect(
            service.evaluate(shortAnswerContext),
        ).resolves.toMatchObject({
            result: {
                answerReviews: [
                    {
                        correctAspects: [],
                        evidenceQuotes: [],
                    },
                ],
            },
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    });

    it('repairs a competency weakness that has no diagnostic finding', async () => {
        const result = validResult();
        result.competencies[0].weaknesses = [
            'Chưa giải thích rõ chiến lược backoff.',
        ];
        const { provider, service } = createService(result);

        await expect(service.evaluate(context)).resolves.toMatchObject({
            result: {
                diagnosticFindings: [
                    {
                        competencyKey: 'api',
                        evidenceStatus: 'PARTIALLY_DEMONSTRATED',
                        evidenceTurnIds: [turnId],
                    },
                ],
            },
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    });

    it('accepts a substantive review for an unanswered turn without requiring an example', async () => {
        const result = validResult();
        result.answerReviews[0].correctAspects = [];
        const { provider, service } = createService(result);
        const shortAnswerContext = {
            ...context,
            turns: [{ ...context.turns[0], answerText: 'Em chÆ°a rÃµ' }],
        };

        await expect(
            service.evaluate(shortAnswerContext),
        ).resolves.toMatchObject({ result: { schemaVersion: 2 } });
        expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    });

    it('rejects duplicate review section types', async () => {
        const result = validResult();
        const section = {
            type: 'KNOWLEDGE_EXPLANATION' as const,
            title: 'Kiáº¿n thá»©c ná»n',
            data: {
                explanation: 'Giáº£i thÃ­ch cÃ¡ch xá»­ lÃ½ lá»—i API.',
                keyPoints: ['PhÃ¢n loáº¡i lá»—i'],
                commonMisconception: null,
            },
        };
        result.answerReviews[0].reviewSections = [section, section];
        const { provider, service } = createService(result);

        await expect(service.evaluate(context)).rejects.toMatchObject({
            code: 'AI_SCHEMA_VALIDATION_FAILED',
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(3);
    });
    it('keeps a concise optional example without failing the core evaluation', async () => {
        const result = validResult();
        result.answerReviews[0].exampleImprovedAnswer =
            'TÃ´i sáº½ xá»­ lÃ½ lá»—i rÃµ rÃ ng hÆ¡n trong á»©ng dá»¥ng.';
        const { provider, service } = createService(result);

        await expect(service.evaluate(context)).resolves.toMatchObject({
            result: { schemaVersion: 2 },
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    });
    it('rejects fabricated turn references', async () => {
        const result = validResult();
        result.competencies[0].evidenceTurnIds = [
            '99999999-9999-4999-8999-999999999999',
        ];
        const { provider, service } = createService(result);

        await expect(service.evaluate(context)).rejects.toMatchObject({
            code: 'AI_SCHEMA_VALIDATION_FAILED',
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(3);
    });

    it('rejects scores for competencies declared not assessed', async () => {
        const result = validResult();
        result.competencies[0] = {
            ...result.competencies[0],
            coverageStatus: 'NOT_ASSESSED',
        };
        const { service } = createService(result);

        await expect(service.evaluate(context)).rejects.toMatchObject({
            code: 'AI_SCHEMA_VALIDATION_FAILED',
        });
    });

    it('repairs a low score that is missing an evidence-linked diagnostic finding', async () => {
        const result = validResult();
        result.competencies[0] = {
            ...result.competencies[0],
            score: 3,
            strengths: [],
            weaknesses: [],
        };
        const { provider, service } = createService(result);

        await expect(service.evaluate(context)).resolves.toMatchObject({
            result: {
                diagnosticFindings: [
                    {
                        id: 'normalized-low-score-api',
                        competencyKey: 'api',
                        evidenceStatus: 'INSUFFICIENT_EVIDENCE',
                        evidenceTurnIds: [turnId],
                    },
                ],
                recommendations: [
                    {
                        competencyKey: 'api',
                        topic: 'API',
                        relatedFindingIds: ['normalized-low-score-api'],
                    },
                ],
            },
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    });

    it('builds roadmap coverage for every low-scoring evidenced competency', async () => {
        const secondTurnId = '44444444-4444-4444-8444-444444444444';
        const result = validResult();
        result.competencies[0] = {
            ...result.competencies[0],
            score: 0,
            strengths: [],
            weaknesses: ['Missing API error handling evidence.'],
        };
        result.competencies.push({
            competencyKey: 'testing',
            name: 'Testing',
            priority: 'HIGH',
            score: 0,
            coverageStatus: 'INSUFFICIENT',
            confidence: 'LOW',
            summary: 'Testing evidence is insufficient.',
            strengths: [],
            weaknesses: ['No testing approach was demonstrated.'],
            evidenceTurnIds: [secondTurnId],
        });
        result.answerReviews.push({
            ...result.answerReviews[0],
            turnId: secondTurnId,
            competencyKey: 'testing',
            correctAspects: [],
            missingAspects: ['Testing strategy.'],
        });
        const expandedContext = {
            ...context,
            competencyMap: [
                ...context.competencyMap,
                {
                    key: 'testing',
                    name: 'Testing',
                    priority: 'HIGH',
                    expectedDepth: 'FOUNDATION',
                    evidenceNeeded: ['Testing strategy.'],
                    probeAreas: ['Unit testing'],
                    sources: ['ROLE_BASELINE'],
                },
            ],
            turns: [
                ...context.turns,
                {
                    ...context.turns[0],
                    id: secondTurnId,
                    runtimeOrder: 2,
                    rootPlannedQuestionKey: 'planned:2',
                    questionType: 'TECHNICAL',
                    competencyKey: 'testing',
                    topic: 'Testing',
                    questionText: 'How do you test this behavior?',
                    answerText: 'I do not know.',
                },
            ],
        };
        const { service } = createService(result);

        const evaluation = await service.evaluate(expandedContext);

        expect(
            evaluation.result.recommendations.map(
                (recommendation) => recommendation.competencyKey,
            ),
        ).toEqual(['api', 'testing']);
    });

    it('rejects recommendations that are not linked to a finding', async () => {
        const result = validResult();
        result.recommendations.push({
            competencyKey: 'api',
            priority: 'HIGH',
            topic: 'HTTP errors',
            reason: 'Needs practice',
            learningObjectives: ['Handle status codes'],
            suggestedExercises: ['Build an error interceptor'],
            expectedOutcome: 'Reliable API error handling',
            relatedFindingIds: [],
        });
        const { service } = createService(result);

        await expect(service.evaluate(context)).rejects.toMatchObject({
            code: 'AI_SCHEMA_VALIDATION_FAILED',
        });
    });

    it('rejects competency metadata that differs from the authoritative map', async () => {
        const result = validResult();
        result.competencies[0].priority = 'LOW';
        const { service } = createService(result);

        await expect(service.evaluate(context)).rejects.toMatchObject({
            code: 'AI_SCHEMA_VALIDATION_FAILED',
        });
    });
    it('accepts a concise answer when it contains grounded evidence', async () => {
        const result = validResult();
        const conciseContext = {
            ...context,
            turns: [
                { ...context.turns[0], answerText: '401 lÃ  unauthorized' },
            ],
        };
        const { service } = createService(result);

        await expect(service.evaluate(conciseContext)).resolves.toMatchObject({
            result: { answerReviews: [{ correctAspects: expect.any(Array) }] },
        });
    });

    it('rejects duplicate explicit review section ordering', async () => {
        const result = validResult();
        result.answerReviews[0].reviewSections = [
            {
                type: 'ANSWER_STRUCTURE',
                title: 'Cáº¥u trÃºc tráº£ lá»i',
                order: 1,
                data: {
                    steps: [
                        {
                            label: 'Nháº­n diá»‡n',
                            guidance: 'PhÃ¢n loáº¡i mÃ£ lá»—i.',
                        },
                        {
                            label: 'Xá»­ lÃ½',
                            guidance: 'Chá»n hÃ nh Ä‘á»™ng phÃ¹ há»£p.',
                        },
                    ],
                },
            },
            {
                type: 'KNOWLEDGE_EXPLANATION',
                title: 'Kiáº¿n thá»©c ná»n',
                order: 1,
                data: {
                    explanation:
                        'PhÃ¢n biá»‡t lá»—i xÃ¡c thá»±c vÃ  lá»—i mÃ¡y chá»§.',
                    keyPoints: [
                        '401 khÃ´ng pháº£i lá»—i cÃ³ thá»ƒ retry mÃ¹ quÃ¡ng.',
                    ],
                    commonMisconception: null,
                },
            },
        ];
        const { provider, service } = createService(result);

        await expect(service.evaluate(context)).rejects.toMatchObject({
            code: 'AI_SCHEMA_VALIDATION_FAILED',
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(3);
    });

    it('rejects a comparison section without an improved answer section', async () => {
        const result = validResult();
        result.answerReviews[0].reviewSections = [
            {
                type: 'ANSWER_COMPARISON',
                title: 'So sÃ¡nh',
                data: {
                    changes: [
                        {
                            area: 'Láº­p luáº­n',
                            original: 'Chá»‰ nÃªu retry.',
                            improved: 'PhÃ¢n loáº¡i lá»—i trÆ°á»›c khi retry.',
                            reason: 'TrÃ¡nh retry lá»—i khÃ´ng thá»ƒ phá»¥c há»“i.',
                        },
                    ],
                    summary:
                        'Báº£n má»›i giáº£i thÃ­ch quyáº¿t Ä‘á»‹nh rÃµ hÆ¡n.',
                },
            },
        ];
        const { service } = createService(result);

        await expect(service.evaluate(context)).rejects.toMatchObject({
            code: 'AI_SCHEMA_VALIDATION_FAILED',
        });
    });

    it('classifies a dont-know answer as missing evidence instead of an incorrect claim', async () => {
        const result = validResult();
        result.competencies[0] = {
            ...result.competencies[0],
            score: 0,
            coverageStatus: 'SUFFICIENT',
            confidence: 'HIGH',
            strengths: [],
            weaknesses: ['The answer did not demonstrate API knowledge.'],
        };
        result.answerReviews[0].correctAspects = [];
        result.answerReviews[0].incorrectAspects = [
            'The candidate did not know.',
        ];
        result.answerReviews[0].missingAspects = [];
        result.diagnosticFindings.push({
            id: 'api-missing-evidence',
            competencyKey: 'api',
            subarea: 'Error handling',
            category: 'KNOWLEDGE_GAP',
            evidenceStatus: 'DEMONSTRATED_GAP',
            severity: 'HIGH',
            observation: 'No substantive answer was provided.',
            expectedUnderstanding: 'Explain an API error strategy.',
            explanation: 'The answer does not provide assessable evidence.',
            evidenceTurnIds: [turnId],
            improvementAction: 'Explain status handling and retry decisions.',
            suggestedPractice: 'Practice one API failure scenario.',
        });
        const { service } = createService(result);
        const dontKnowContext = {
            ...context,
            turns: [{ ...context.turns[0], answerText: 'Em khong biet.' }],
        };

        await expect(service.evaluate(dontKnowContext)).resolves.toMatchObject({
            result: {
                competencies: [
                    {
                        coverageStatus: 'INSUFFICIENT',
                        confidence: 'LOW',
                    },
                ],
                diagnosticFindings: [
                    { evidenceStatus: 'INSUFFICIENT_EVIDENCE' },
                ],
                answerReviews: [
                    {
                        answerStatus: 'DONT_KNOW',
                        correctAspects: [],
                        incorrectAspects: [],
                        missingAspects: ['The candidate did not know.'],
                    },
                ],
            },
        });
    });
    it('classifies a short self introduction as partial and uses the frozen objective', async () => {
        const result = validResult();
        result.answerReviews[0].correctAspects = [
            'Candidate stated their name.',
        ];
        result.answerReviews[0].missingAspects = ['Relevant experience.'];
        result.answerReviews[0].exampleImprovedAnswer =
            'Xin chÃ o, tÃ´i lÃ  Nguyá»…n Äá»©c Khoa. TÃ´i Ä‘ang phÃ¡t triá»ƒn theo Ä‘á»‹nh hÆ°á»›ng Backend Developer vÃ  Ä‘Ã£ thá»±c hÃ nh xá»­ lÃ½ API trong cÃ¡c dá»± Ã¡n Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c minh. TÃ´i muá»‘n tiáº¿p tá»¥c cá»§ng cá»‘ kháº£ nÄƒng xÃ¢y dá»±ng dá»‹ch vá»¥ á»•n Ä‘á»‹nh vÃ  phÃ¹ há»£p vá»›i vá»‹ trÃ­ nÃ y.';
        result.answerReviews[0].exampleImprovedAnswerType = 'ILLUSTRATIVE';
        const introContext = {
            ...context,
            turns: [
                {
                    ...context.turns[0],
                    questionType: 'GENERAL',
                    questionText: 'Please introduce yourself.',
                    answerText: 'Xin chao, toi la Nguyen Duc Khoa.',
                    authoritativeObjective:
                        'Assess a concise introduction and relevant background.',
                    evaluationCriteria: [
                        'State identity and current role.',
                        'Summarize relevant background.',
                    ],
                },
            ],
        };
        const { service } = createService(result);

        const evaluation = await service.evaluate(introContext);
        const answerReview = evaluation.result.answerReviews[0];
        const criteriaSection = answerReview.reviewSections.find(
            (section) => section.type === 'CRITERIA_ANALYSIS',
        );

        expect(answerReview).toMatchObject({
            answerStatus: 'PARTIAL',
            questionObjective:
                'Assess a concise introduction and relevant background.',
        });
        expect(
            answerReview.reviewSections.map((section) => section.type),
        ).toEqual(
            expect.arrayContaining([
                'CRITERIA_ANALYSIS',
                'ANSWER_STRUCTURE',
                'IMPROVED_ANSWER',
                'ANSWER_COMPARISON',
            ]),
        );
        expect(criteriaSection?.data.criteria).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'planned-1-criterion-1',
                    status: 'PARTIALLY_DEMONSTRATED',
                }),
            ]),
        );
    });

    it.each([
        ['', 'NO_RESPONSE'],
        ['Alo', 'NO_RESPONSE'],
        ['Em khong biet', 'DONT_KNOW'],
        ['Xin phep khong tra loi cau nay', 'REFUSED'],
    ] as const)(
        'normalizes %p to %s without fabricated praise',
        async (answerText, status) => {
            const result = validResult();
            const { service } = createService(result);

            await expect(
                service.evaluate({
                    ...context,
                    turns: [{ ...context.turns[0], answerText }],
                }),
            ).resolves.toMatchObject({
                result: {
                    answerReviews: [
                        {
                            answerStatus: status,
                            correctAspects: [],
                            incorrectAspects: [],
                        },
                    ],
                },
            });
        },
    );

    it('keeps only verbatim candidate evidence quotes', async () => {
        const result = validResult();
        result.answerReviews[0].evidenceQuotes = [
            'retry cÃ³ giá»›i háº¡n',
            'candidate used exponential backoff',
        ];
        const { service } = createService(result);

        await expect(service.evaluate(context)).resolves.toMatchObject({
            result: {
                answerReviews: [{ evidenceQuotes: ['retry cÃ³ giá»›i háº¡n'] }],
            },
        });
    });

    it('repairs a missing per-turn review without discarding the report', async () => {
        const secondTurnId = '44444444-4444-4444-8444-444444444444';
        const result = validResult();
        const { provider, service } = createService(result);

        const evaluation = await service.evaluate({
            ...context,
            turns: [
                context.turns[0],
                {
                    ...context.turns[0],
                    id: secondTurnId,
                    runtimeOrder: 2,
                    rootPlannedQuestionKey: 'planned:2',
                    questionText: 'Báº¡n xá»­ lÃ½ lá»—i 500 nhÆ° tháº¿ nÃ o?',
                    questionType: 'GENERAL',
                    answerText: '',
                },
            ],
        });

        expect(provider.generateStructured).toHaveBeenCalledTimes(1);
        expect(evaluation.result.answerReviews).toHaveLength(2);
        expect(evaluation.result.answerReviews[1]).toMatchObject({
            turnId: secondTurnId,
            answerStatus: 'NO_RESPONSE',
            correctAspects: [],
            incorrectAspects: [],
        });
    });

    it('expands a thin improvement into actionable guidance', async () => {
        const result = validResult();
        result.answerReviews[0].improvement = 'NÃ³i rÃµ hÆ¡n.';
        const { service } = createService(result);

        const evaluation = await service.evaluate(context);
        expect(
            evaluation.result.answerReviews[0].improvement.trim().split(/\s+/)
                .length,
        ).toBeGreaterThanOrEqual(8);
    });
    it('evaluates question reviews independently from the overall report', async () => {
        const reviews = validResult().answerReviews;
        const provider = {
            providerName: 'test',
            modelName: 'test-model',
            generateStructured: jest.fn().mockResolvedValue({
                data: { answerReviews: reviews },
                modelName: 'test-model',
            }),
        } satisfies AiProvider;
        const service = new InterviewEvaluatorService(provider);

        await expect(
            service.evaluateQuestionReviews(context),
        ).resolves.toMatchObject({
            result: { schemaVersion: 1, answerReviews: reviews },
        });
        expect(provider.generateStructured).toHaveBeenCalledWith(
            expect.objectContaining({
                responseJsonSchema: expect.objectContaining({ type: 'object' }),
            }),
        );
    });

    it('retries when a technical question review omits CODE_EXAMPLE', async () => {
        const reviewsWithoutCode = validResult().answerReviews.map(
            (review) => ({ ...review, reviewSections: [] }),
        );
        const reviewsWithCode = validResult().answerReviews;
        const provider = {
            providerName: 'test',
            modelName: 'test-model',
            generateStructured: jest
                .fn()
                .mockResolvedValueOnce({
                    data: { answerReviews: reviewsWithoutCode },
                    modelName: 'test-model',
                })
                .mockResolvedValueOnce({
                    data: { answerReviews: reviewsWithCode },
                    modelName: 'test-model',
                }),
        } satisfies AiProvider;
        const service = new InterviewEvaluatorService(provider);

        await expect(
            service.evaluateQuestionReviews(context),
        ).resolves.toMatchObject({
            result: { answerReviews: reviewsWithCode },
        });
        expect(provider.generateStructured).toHaveBeenCalledTimes(2);
        expect(provider.generateStructured).toHaveBeenLastCalledWith(
            expect.objectContaining({
                prompt: expect.stringContaining(
                    'MISSING_TECHNICAL_CODE_EXAMPLE',
                ),
            }),
        );
    });

    it('builds the overall report from persisted question reviews', async () => {
        const fullResult = validResult();
        const { answerReviews: rawAnswerReviews, ...overallResult } =
            fullResult;
        const { answerReviews } = QuestionReviewBatchSchema.parse({
            answerReviews: rawAnswerReviews,
        });
        const provider = {
            providerName: 'test',
            modelName: 'test-model',
            generateStructured: jest.fn().mockResolvedValue({
                data: overallResult,
                modelName: 'test-model',
            }),
        } satisfies AiProvider;
        const service = new InterviewEvaluatorService(provider);

        await expect(
            service.evaluateOverall(context, answerReviews),
        ).resolves.toMatchObject({
            result: { answerReviews, competencies: [{ competencyKey: 'api' }] },
        });
    });
});
