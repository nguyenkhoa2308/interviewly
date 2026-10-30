import {
    findQuestionStyleIssues,
    simplifyCompoundQuestion,
} from './question-style.validator';

describe('generated interview question style', () => {
    it('accepts short, spoken, single-intent Junior fundamentals', () => {
        expect(
            findQuestionStyleIssues({
                questionText: 'useEffect dùng để làm gì?',
                primaryIntent: 'Kiểm tra mục đích cơ bản của useEffect.',
                level: 'JUNIOR',
                questionType: 'TECHNICAL',
            }),
        ).toEqual([]);
        expect(
            findQuestionStyleIssues({
                questionText: 'interface và type khác nhau như thế nào?',
                primaryIntent: 'Phân biệt interface và type.',
                level: 'JUNIOR',
                questionType: 'TECHNICAL',
            }),
        ).toEqual([]);
    });

    it('rejects the previous compound useEffect wording', () => {
        expect(
            findQuestionStyleIssues({
                questionText:
                    'Bạn thường xử lý các side effect trong React component như thế nào và khi nào cần dùng dependency array trong useEffect?',
                primaryIntent: 'Kiểm tra useEffect.',
                level: 'JUNIOR',
                questionType: 'TECHNICAL',
            }),
        ).toContain('COMPOUND_QUESTION');
    });

    it('keeps the first intent when deterministically simplifying a repeated compound question', () => {
        expect(
            simplifyCompoundQuestion(
                'Bạn xử lý side effect như thế nào và khi nào cần dùng dependency array?',
            ),
        ).toBe('Bạn xử lý side effect như thế nào?');
    });
    it('rejects a verbose written-style Junior introduction', () => {
        const issues = findQuestionStyleIssues({
            questionText:
                'Bạn hãy chia sẻ cách mình đã xây dựng hành trình học tập và kinh nghiệm làm việc Frontend của mình trong thời gian qua để nhà tuyển dụng hiểu rõ hơn?',
            primaryIntent: 'Mở đầu cuộc phỏng vấn.',
            level: 'FRESHER',
            questionType: 'GENERAL',
        });
        expect(issues).toContain('FORMAL_WRITTEN_STYLE');
    });

    it('does not mistake a single comparison list for a compound question', () => {
        expect(
            findQuestionStyleIssues({
                questionText: 'var, let và const khác nhau như thế nào?',
                primaryIntent: 'Phân biệt cách khai báo biến.',
                level: 'FRESHER',
                questionType: 'TECHNICAL',
            }),
        ).toEqual([]);
    });

    it('rejects leaked CV/JD framing in a fundamental question', () => {
        expect(
            findQuestionStyleIssues({
                questionText:
                    'JD yêu cầu React, vậy component React re-render khi nào?',
                primaryIntent: 'Kiểm tra cơ chế re-render.',
                level: 'JUNIOR',
                questionType: 'TECHNICAL',
            }),
        ).toContain('SOURCE_CONTEXT_LEAKED');
    });

    it('allows necessary single-intent scenarios for Middle and Senior', () => {
        expect(
            findQuestionStyleIssues({
                questionText:
                    'Nếu thời gian phản hồi của hệ thống tăng đột biến sau một đợt deploy, bạn sẽ khoanh vùng nguyên nhân theo thứ tự nào?',
                primaryIntent: 'Kiểm tra quy trình chẩn đoán production.',
                level: 'SENIOR',
                questionType: 'TECHNICAL',
            }),
        ).toEqual([]);
    });
});
