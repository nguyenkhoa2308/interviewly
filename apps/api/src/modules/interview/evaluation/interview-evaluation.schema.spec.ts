import {
    ReviewSectionSchema,
    ReviewSectionsSchema,
} from './interview-evaluation.schema';

describe('ReviewSectionSchema', () => {
    it.each([
        {
            type: 'CRITERIA_ANALYSIS',
            title: 'Phân tích chi tiết',
            order: 1,
            data: {
                criteria: [
                    {
                        name: 'Độ chính xác',
                        status: 'DEMONSTRATED',
                        evidence: 'Nêu đúng cơ chế.',
                        missing: null,
                    },
                ],
                overallAssessment: 'Đáp ứng yêu cầu.',
            },
        },
        {
            type: 'ANSWER_STRUCTURE',
            title: 'Cấu trúc gợi ý',
            data: {
                steps: [
                    { label: 'Mở đầu', guidance: 'Nêu bối cảnh.' },
                    { label: 'Kết luận', guidance: 'Nêu kết quả.' },
                ],
            },
        },
        {
            type: 'KNOWLEDGE_EXPLANATION',
            title: 'Giải thích kiến thức',
            data: {
                explanation: 'Giải thích khái niệm.',
                keyPoints: ['Ý chính'],
                commonMisconception: null,
            },
        },
        {
            type: 'CODE_EXAMPLE',
            title: 'Ví dụ minh họa',
            data: {
                language: 'typescript',
                code: 'const ok = true;',
                explanation: 'Ví dụ tối giản.',
            },
        },
        {
            type: 'SCENARIO_APPROACH',
            title: 'Cách tiếp cận',
            data: {
                steps: [
                    { label: 'Làm rõ', detail: 'Xác nhận mục tiêu.' },
                    { label: 'Kiểm chứng', detail: 'Đo kết quả.' },
                ],
                validation: null,
            },
        },
        {
            type: 'TRADEOFF_ANALYSIS',
            title: 'Phân tích đánh đổi',
            data: {
                options: [
                    {
                        name: 'A',
                        advantages: ['Nhanh'],
                        disadvantages: ['Ít linh hoạt'],
                        whenToUse: 'Khi cần tốc độ.',
                    },
                    {
                        name: 'B',
                        advantages: ['Linh hoạt'],
                        disadvantages: ['Tốn công'],
                        whenToUse: 'Khi cần tùy biến.',
                    },
                ],
                recommendation: null,
            },
        },
        {
            type: 'STAR_ANALYSIS',
            title: 'Phân tích STAR',
            data: {
                situation: 'Bối cảnh',
                task: 'Nhiệm vụ',
                action: 'Hành động',
                result: 'Kết quả',
                missingParts: [],
            },
        },
        {
            type: 'INTERVIEWER_PERSPECTIVE',
            title: 'Góc nhìn nhà tuyển dụng',
            data: {
                positiveSignals: ['Lập luận rõ'],
                concerns: [],
                likelyFollowUps: ['Bạn đo kết quả ra sao?'],
            },
        },
        {
            type: 'IMPROVED_ANSWER',
            title: 'Câu trả lời tốt hơn',
            data: { answer: 'Đây là câu trả lời minh họa có căn cứ.' },
        },
        {
            type: 'ANSWER_COMPARISON',
            title: 'So sánh',
            data: {
                changes: [
                    {
                        area: 'Bằng chứng',
                        original: null,
                        improved: 'Thêm ví dụ.',
                        reason: 'Tăng tính thuyết phục.',
                    },
                ],
                summary: 'Bản mới rõ bằng chứng hơn.',
            },
        },
    ])('accepts $type', (section) => {
        expect(ReviewSectionSchema.safeParse(section).success).toBe(true);
    });

    it('rejects unsupported and malformed section payloads', () => {
        expect(
            ReviewSectionSchema.safeParse({
                type: 'UNSUPPORTED',
                title: 'X',
                data: {},
            }).success,
        ).toBe(false);
        expect(
            ReviewSectionSchema.safeParse({
                type: 'CRITERIA_ANALYSIS',
                title: 'X',
                data: { criteria: [], overallAssessment: 'X' },
            }).success,
        ).toBe(false);
    });

    it('normalizes bounded aliases commonly returned for scenario steps', () => {
        const parsed = ReviewSectionSchema.parse({
            type: 'SCENARIO_APPROACH',
            title: 'Scenario approach',
            data: {
                steps: [
                    { title: 'Clarify', description: 'Confirm the goal.' },
                    {
                        action: 'Validate',
                        expectedOutcome: 'Measure the result.',
                    },
                ],
                validation: ['Check metrics.', 'Confirm with the user.'],
            },
        });

        expect(parsed).toMatchObject({
            data: {
                steps: [
                    { label: 'Clarify', detail: 'Confirm the goal.' },
                    { label: 'Validate', detail: 'Measure the result.' },
                ],
                validation: 'Check metrics. Confirm with the user.',
            },
        });
    });
    it('keeps valid optional sections while dropping malformed siblings', () => {
        const parsed = ReviewSectionsSchema.parse([
            {
                type: 'KNOWLEDGE_EXPLANATION',
                title: 'Knowledge',
                data: {
                    explanation: 'A grounded explanation.',
                    keyPoints: ['One concrete point'],
                    commonMisconception: null,
                },
            },
            {
                type: 'SCENARIO_APPROACH',
                title: 'Broken optional section',
                data: { steps: [{ unknown: true }], validation: null },
            },
        ]);

        expect(parsed).toHaveLength(1);
        expect(parsed[0]?.type).toBe('KNOWLEDGE_EXPLANATION');
    });

    it('accepts rich additive payloads required by the dynamic review UI', () => {
        const sections = [
            {
                type: 'ANSWER_STRUCTURE',
                title: 'Cấu trúc trả lời',
                data: {
                    steps: [
                        {
                            label: 'Bối cảnh',
                            guidance: 'Nêu ngắn gọn.',
                            expectedContent: 'Bối cảnh thật.',
                            speakingTimeSeconds: 15,
                        },
                        {
                            label: 'Kết quả',
                            guidance: 'Nêu kết quả.',
                            expectedContent: null,
                            speakingTimeSeconds: null,
                        },
                    ],
                },
            },
            {
                type: 'KNOWLEDGE_EXPLANATION',
                title: 'Kiến thức',
                data: {
                    explanation: 'Giải thích chính xác.',
                    concepts: ['Closure'],
                    keyPoints: ['Lexical scope'],
                    examples: ['Hàm con truy cập biến ngoài.'],
                    caveats: ['Không đồng nghĩa với global state.'],
                    commonMisconception: null,
                },
            },
            {
                type: 'CODE_EXAMPLE',
                title: 'Ví dụ code',
                data: {
                    language: 'typescript',
                    code: 'const value = true;',
                    explanation: 'Ví dụ tối giản.',
                    expectedBehavior: 'Trả về true.',
                },
            },
            {
                type: 'SCENARIO_APPROACH',
                title: 'Cách xử lý',
                data: {
                    steps: [
                        { label: 'Làm rõ', detail: 'Xác nhận triệu chứng.' },
                        { label: 'Kiểm tra', detail: 'Thu thập bằng chứng.' },
                    ],
                    reasoning: 'Giảm phạm vi nguyên nhân trước khi sửa.',
                    alternatives: [
                        {
                            option: 'Rollback',
                            whenToUse: 'Khi lỗi ảnh hưởng production.',
                        },
                    ],
                    validation: 'Chạy lại test.',
                },
            },
            {
                type: 'TRADEOFF_ANALYSIS',
                title: 'Đánh đổi',
                data: {
                    options: [
                        {
                            name: 'A',
                            advantages: ['Nhanh'],
                            disadvantages: ['Ít linh hoạt'],
                            whenToUse: 'MVP',
                        },
                        {
                            name: 'B',
                            advantages: ['Linh hoạt'],
                            disadvantages: ['Phức tạp'],
                            whenToUse: 'Scale',
                        },
                    ],
                    decisionCriteria: ['Thời gian', 'Độ phức tạp'],
                    recommendation: null,
                },
            },
        ];
        expect(
            sections.every(
                (section) => ReviewSectionSchema.safeParse(section).success,
            ),
        ).toBe(true);

        expect(
            ReviewSectionSchema.safeParse({
                type: 'STAR_ANALYSIS',
                title: 'STAR',
                data: {
                    situation: null,
                    task: null,
                    action: null,
                    result: null,
                    missingParts: ['SITUATION', 'TASK', 'ACTION', 'RESULT'],
                    contentSource: 'GUIDANCE_PLACEHOLDER',
                },
            }).success,
        ).toBe(true);
        expect(
            ReviewSectionSchema.safeParse({
                type: 'IMPROVED_ANSWER',
                title: 'Câu trả lời tốt hơn',
                data: {
                    answer: 'Một câu trả lời minh họa.',
                    answerType: 'ILLUSTRATIVE',
                    improvements: ['Bổ sung lập luận'],
                },
            }).success,
        ).toBe(true);
        expect(
            ReviewSectionSchema.safeParse({
                type: 'ANSWER_COMPARISON',
                title: 'So sánh',
                data: {
                    originalAnswer: 'Câu trả lời gốc.',
                    improvedAnswer: 'Câu trả lời cải thiện.',
                    changes: [
                        {
                            area: 'Lập luận',
                            original: 'Ngắn',
                            improved: 'Rõ hơn',
                            reason: 'Có bằng chứng',
                        },
                    ],
                    summary: 'Khác biệt có ý nghĩa.',
                },
            }).success,
        ).toBe(true);
    });
});
