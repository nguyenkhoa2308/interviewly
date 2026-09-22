export type AiErrorCode =
    | 'AI_CONFIGURATION_ERROR'
    | 'AI_PROVIDER_ERROR'
    | 'AI_TIMEOUT'
    | 'AI_RATE_LIMITED'
    | 'AI_EMPTY_RESPONSE'
    | 'AI_INVALID_RESPONSE'
    | 'AI_SCHEMA_VALIDATION_FAILED'
    | 'AI_INVALID_INPUT';

const SAFE_MESSAGES: Record<AiErrorCode, string> = {
    AI_CONFIGURATION_ERROR: 'Cấu hình dịch vụ AI không hợp lệ.',
    AI_PROVIDER_ERROR: 'Dịch vụ AI hiện không thể xử lý yêu cầu.',
    AI_TIMEOUT: 'Dịch vụ AI phản hồi quá thời gian cho phép.',
    AI_RATE_LIMITED: 'Dịch vụ AI đang giới hạn tần suất yêu cầu.',
    AI_EMPTY_RESPONSE: 'Dịch vụ AI không trả về nội dung phân tích.',
    AI_INVALID_RESPONSE: 'Dịch vụ AI trả về dữ liệu không hợp lệ.',
    AI_SCHEMA_VALIDATION_FAILED:
        'Kết quả phân tích AI không đúng cấu trúc yêu cầu.',
    AI_INVALID_INPUT: 'Nội dung CV không hợp lệ để phân tích.',
};

export class AiException extends Error {
    readonly safeMessage: string;

    constructor(
        readonly code: AiErrorCode,
        options?: { cause?: unknown },
    ) {
        super(SAFE_MESSAGES[code], options);
        this.name = 'AiException';
        this.safeMessage = SAFE_MESSAGES[code];
    }
}
