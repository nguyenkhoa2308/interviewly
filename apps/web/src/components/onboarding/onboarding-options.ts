import type {
    ContentPreference,
    InterviewGoal,
} from '@/services/onboarding.service';

export const targetRoles = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Engineer',
    'Machine Learning Engineer',
] as const;

export const experienceOptions = [
    ['INTERN', 'Intern', 'Đang học hoặc mới bắt đầu'],
    ['FRESHER', 'Fresher', 'Dưới 1 năm kinh nghiệm'],
    ['JUNIOR', 'Junior', 'Khoảng 1 đến 2 năm'],
    ['MIDDLE', 'Middle', 'Khoảng 2 đến 4 năm'],
    ['SENIOR', 'Senior', 'Khoảng 5 năm trở lên'],
    ['LEAD', 'Lead', 'Dẫn dắt đội nhóm kỹ thuật'],
] as const;

export const goalOptions: Array<[InterviewGoal, string]> = [
    ['GET_A_JOB', 'Tìm được công việc mới'],
    ['IMPROVE_SKILLS', 'Cải thiện kỹ năng phỏng vấn'],
    ['CRACK_TOP_COMPANIES', 'Chinh phục công ty hàng đầu'],
    ['SWITCH_CAREER', 'Chuyển hướng nghề nghiệp'],
    ['BOOST_INTERVIEW_CONFIDENCE', 'Tăng sự tự tin'],
    ['IMPROVE_RESUME', 'Cải thiện CV'],
    ['PRACTICE_COMMUNICATION', 'Luyện giao tiếp'],
    ['OTHER', 'Mục tiêu khác'],
];

export const learningStyleOptions = [
    ['LEARN_BY_DOING', 'Học qua thực hành'],
    ['LEARN_BY_READING', 'Học qua tài liệu'],
    ['LEARN_BY_WATCHING', 'Học qua video'],
    ['MIXED', 'Kết hợp nhiều cách'],
] as const;

export const contentOptions: Array<[ContentPreference, string]> = [
    ['DATA_STRUCTURES_ALGORITHMS', 'Cấu trúc dữ liệu và giải thuật'],
    ['SYSTEM_DESIGN', 'System Design'],
    ['FRONTEND_FRAMEWORKS', 'Frontend Frameworks'],
    ['BEHAVIORAL_QUESTIONS', 'Câu hỏi hành vi'],
    ['CODING_CHALLENGES', 'Coding Challenges'],
    ['RESUME_PORTFOLIO', 'CV và Portfolio'],
];
