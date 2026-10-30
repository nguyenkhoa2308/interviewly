import { describe, expect, it } from 'vitest';
import { parseInterviewReviewSections } from './interview-review-section.schema';

describe('parseInterviewReviewSections', () => {
    it('keeps valid sections, orders them, and drops malformed or unsupported sections', () => {
        const result = parseInterviewReviewSections([
            {
                type: 'IMPROVED_ANSWER',
                title: 'Câu trả lời tham khảo',
                order: 3,
                data: {
                    answer: 'Một câu trả lời có cấu trúc và đủ bằng chứng.',
                },
            },
            {
                type: 'CRITERIA_ANALYSIS',
                title: 'Phân tích chi tiết',
                order: 1,
                data: {
                    criteria: [
                        {
                            name: 'Độ chính xác',
                            status: 'PARTIALLY_DEMONSTRATED',
                            evidence: 'Ứng viên nêu đúng ý chính.',
                            missing: 'Chưa giải thích cơ chế.',
                        },
                    ],
                    overallAssessment:
                        'Câu trả lời đúng hướng nhưng cần làm rõ.',
                },
            },
            { type: 'UNKNOWN_SECTION', title: 'Unsupported', data: {} },
            { type: 'CODE_EXAMPLE', title: '', data: {} },
        ]);

        expect(result).toHaveLength(2);
        expect(result.map((section) => section.type)).toEqual([
            'CRITERIA_ANALYSIS',
            'IMPROVED_ANSWER',
        ]);
    });

    it('parses role-neutral scenario, trade-off and interviewer sections', () => {
        const result = parseInterviewReviewSections([
            {
                type: 'SCENARIO_APPROACH',
                title: 'Cách tiếp cận',
                data: {
                    steps: [
                        { label: 'Làm rõ', detail: 'Xác nhận mục tiêu.' },
                        { label: 'Kiểm chứng', detail: 'Đo kết quả.' },
                    ],
                    validation: 'So sánh với tiêu chí ban đầu.',
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
                            whenToUse: 'Khi thời gian ngắn.',
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
                type: 'INTERVIEWER_PERSPECTIVE',
                title: 'Góc nhìn nhà tuyển dụng',
                data: {
                    positiveSignals: ['Biết làm rõ yêu cầu.'],
                    concerns: [],
                    likelyFollowUps: ['Bạn đo hiệu quả thế nào?'],
                },
            },
        ]);

        expect(result).toHaveLength(3);
    });

    it('parses the rich fields used by dynamic tabs without requiring them for legacy data', () => {
        const result = parseInterviewReviewSections([
            {
                type: 'ANSWER_STRUCTURE',
                title: 'Cấu trúc',
                data: {
                    steps: [
                        { label: 'Mở đầu', guidance: 'Nêu bối cảnh.', expectedContent: 'Bối cảnh thật.', speakingTimeSeconds: 15 },
                        { label: 'Kết quả', guidance: 'Nêu kết quả.' },
                    ],
                },
            },
            {
                type: 'ANSWER_COMPARISON',
                title: 'So sánh',
                data: {
                    originalAnswer: 'Bản gốc.',
                    improvedAnswer: 'Bản cải thiện.',
                    changes: [{ area: 'Bằng chứng', original: null, improved: 'Thêm ví dụ.', reason: 'Rõ hơn.' }],
                    summary: 'Bản mới rõ hơn.',
                },
            },
        ]);

        expect(result).toHaveLength(2);
        expect(result[0]?.type).toBe('ANSWER_STRUCTURE');
        if (result[0]?.type === 'ANSWER_STRUCTURE') {
            expect(result[0].data.steps[0]?.speakingTimeSeconds).toBe(15);
        }
        expect(result[1]).toMatchObject({
            type: 'ANSWER_COMPARISON',
            data: { originalAnswer: 'Bản gốc.' },
        });
    });

    it('returns an empty list for legacy reports without sections', () => {
        expect(parseInterviewReviewSections(undefined)).toEqual([]);
    });
});
