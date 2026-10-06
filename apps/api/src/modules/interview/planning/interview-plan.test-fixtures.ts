import type { InterviewPlanResult } from './interview-plan.schema';
const question = (
    order: number,
    type: 'GENERAL' | 'TECHNICAL' | 'PROJECT' | 'BEHAVIORAL' | 'CANDIDATE',
    text: string,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null,
) => ({
    order,
    type,
    topic: type,
    competencyKey:
        type === 'TECHNICAL'
            ? 'role-foundations'
            : type === 'PROJECT'
              ? 'project-ownership'
              : type === 'CANDIDATE'
                ? undefined
                : 'collaboration',
    primaryIntent: `Đánh giá một mục tiêu chính số ${order}`,
    suggestedQuestion: text,
    objective: 'Đánh giá năng lực phù hợp',
    difficulty,
    reasonToAsk: null,
    sourceEvidence: [],
    expectedSignals: ['Trả lời rõ ràng và có ví dụ phù hợp'],
    followUpStrategy: {
        ifShallow: 'Hỏi một ví dụ cụ thể.',
        ifStrong: 'Hỏi thêm cách lựa chọn giải pháp.',
        maxDepth: 2,
    },
});
export function makeValidTechnicalPlan(): InterviewPlanResult {
    return {
        summary: 'Kế hoạch Junior Frontend',
        openingStrategy: 'Bắt đầu tự nhiên.',
        difficultyStrategy: 'Đi từ nền tảng đến áp dụng.',
        roleBaseline: [
            {
                key: 'role-foundations',
                name: 'Nền tảng nghề nghiệp',
                description: 'Kiến thức nền tảng cần có cho vai trò và level.',
                expectedDepth: 'APPLICATION',
                rationale: 'Năng lực nền không được mất khi cá nhân hóa.',
            },
            {
                key: 'collaboration',
                name: 'Phối hợp công việc',
                description: 'Khả năng giao tiếp và phối hợp ở level mục tiêu.',
                expectedDepth: 'REAL_EXPERIENCE',
                rationale: 'Cần thiết khi làm việc trong nhóm.',
            },
        ],
        competencyMap: [
            {
                key: 'role-foundations',
                name: 'Nền tảng nghề nghiệp',
                sources: ['ROLE_BASELINE', 'JD'],
                priority: 'KEY',
                expectedDepth: 'APPLICATION',
                evidenceNeeded: ['Giải thích và áp dụng đúng kiến thức nền.'],
                probeAreas: ['khái niệm', 'ứng dụng'],
                rationale: 'Năng lực cốt lõi của vai trò.',
            },
            {
                key: 'data-flow',
                name: 'Luồng dữ liệu và API',
                sources: ['JD'],
                priority: 'HIGH',
                expectedDepth: 'APPLICATION',
                evidenceNeeded: [
                    'Xử lý dữ liệu bất đồng bộ và trạng thái giao diện.',
                ],
                probeAreas: ['API', 'loading', 'error handling'],
                rationale: 'Một năng lực kỹ thuật độc lập cần được phủ.',
            },
            {
                key: 'project-ownership',
                name: 'Đóng góp trong dự án',
                sources: ['CV', 'JD'],
                priority: 'KEY',
                expectedDepth: 'REAL_EXPERIENCE',
                evidenceNeeded: ['Phân biệt rõ đóng góp cá nhân.'],
                probeAreas: ['trách nhiệm', 'quyết định'],
                rationale: 'Xác minh bằng chứng dự án trong CV.',
            },
            {
                key: 'collaboration',
                name: 'Phối hợp công việc',
                sources: ['ROLE_BASELINE', 'JD'],
                priority: 'HIGH',
                expectedDepth: 'REAL_EXPERIENCE',
                evidenceNeeded: ['Mô tả cách phối hợp thực tế.'],
                probeAreas: ['teamwork', 'feedback'],
                rationale: 'Phù hợp kỳ vọng level.',
            },
        ],
        sections: [
            {
                type: 'INTRODUCTION',
                title: 'Giới thiệu',
                objective: 'Làm quen',
                durationMinutes: 3,
                questions: [
                    question(
                        1,
                        'GENERAL',
                        'Bạn giới thiệu một chút về kinh nghiệm Frontend của mình nhé.',
                        'EASY',
                    ),
                ],
            },
            {
                type: 'TECHNICAL',
                title: 'Kiến thức kỹ thuật',
                objective: 'Kiểm tra nền tảng',
                durationMinutes: 12,
                questions: [
                    question(
                        2,
                        'TECHNICAL',
                        'Trong React bạn thường quản lý state như thế nào?',
                        'EASY',
                    ),
                    question(
                        3,
                        'TECHNICAL',
                        'Khi nào bạn dùng useEffect?',
                        'MEDIUM',
                    ),
                    {
                        ...question(
                            4,
                            'TECHNICAL',
                            'Khi gọi API bạn xử lý loading và lỗi như thế nào?',
                            'MEDIUM',
                        ),
                        competencyKey: 'data-flow',
                    },
                ],
            },
            {
                type: 'PROJECT_EXPERIENCE',
                title: 'Dự án và kinh nghiệm',
                objective: 'Xác minh trải nghiệm',
                durationMinutes: 8,
                questions: [
                    question(
                        5,
                        'PROJECT',
                        'Trong những project đã làm, project nào bạn tham gia nhiều nhất?',
                        'EASY',
                    ),
                    question(
                        6,
                        'PROJECT',
                        'Trong project đó bạn trực tiếp phụ trách phần nào?',
                        'MEDIUM',
                    ),
                ],
            },
            {
                type: 'BEHAVIORAL_WORKING_STYLE',
                title: 'Cách làm việc',
                objective: 'Hiểu cách phối hợp',
                durationMinutes: 4,
                questions: [
                    question(
                        7,
                        'BEHAVIORAL',
                        'Khi requirement thay đổi, bạn thường xử lý thế nào?',
                        'EASY',
                    ),
                ],
            },
            {
                type: 'CANDIDATE_QUESTIONS',
                title: 'Trao đổi cuối buổi',
                objective: 'Dành thời gian cho ứng viên',
                durationMinutes: 3,
                questions: [
                    question(
                        8,
                        'CANDIDATE',
                        'Bạn có câu hỏi gì muốn trao đổi thêm về công việc hoặc team không?',
                        null,
                    ),
                ],
            },
        ],
        strengthsToValidate: [],
        gapsToProbe: [],
        projectAreasToExplore: [],
        behavioralCompetencies: ['Teamwork'],
        technicalCompetencies: ['React'],
        adaptationGuidance: ['Đào sâu dựa trên câu trả lời.'],
    };
}
export const planningContexts = {
    juniorWithWork: {
        candidateProfile: { experienceLevel: 'JUNIOR', yearsOfExperience: 1.5 },
        cv: {
            analysis: {
                projects: [{ name: 'Task Hub' }],
                workExperiences: [{ company: 'Example' }],
            },
        },
        configuration: {
            interviewType: 'TECHNICAL',
            durationMinutes: 30,
            questionCount: 8,
        },
    },
    fresherPersonalProjects: {
        candidateProfile: { experienceLevel: 'FRESHER', yearsOfExperience: 0 },
        cv: {
            analysis: {
                projects: [{ name: 'Personal app' }],
                workExperiences: [],
            },
        },
        configuration: {
            interviewType: 'TECHNICAL',
            durationMinutes: 30,
            questionCount: 8,
        },
    },
    missingTestingEvidence: {
        candidateProfile: { experienceLevel: 'JUNIOR' },
        cv: { analysis: { projects: [], workExperiences: [] } },
        match: { gaps: [{ title: 'Testing chưa có bằng chứng' }] },
        configuration: {
            interviewType: 'TECHNICAL',
            durationMinutes: 30,
            questionCount: 8,
        },
    },
    strongProject: {
        candidateProfile: { experienceLevel: 'MIDDLE' },
        cv: {
            analysis: {
                projects: [
                    {
                        name: 'Production dashboard',
                        evidence: 'Owned key modules',
                    },
                ],
                workExperiences: [],
            },
        },
        configuration: {
            interviewType: 'TECHNICAL',
            durationMinutes: 45,
            questionCount: 11,
        },
    },
};
