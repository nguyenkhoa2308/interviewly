import { Inject, Injectable, Logger } from '@nestjs/common';

import { MAX_EXTRACTED_CV_TEXT_LENGTH } from '../constants/cv.constant';
import { PDF_PARSER_FACTORY } from './pdf-parser.tokens';
import {
    PdfParsingException,
    type ParsedPdfResult,
    type PdfParserFactory,
    type PdfParserInstance,
} from './pdf-parser.types';
import { normalizePdfText } from './pdf-text-normalizer';

@Injectable()
export class PdfParserService {
    private readonly logger = new Logger(PdfParserService.name);

    constructor(
        @Inject(PDF_PARSER_FACTORY)
        private readonly createParser: PdfParserFactory,
    ) {}

    async parse(buffer: Buffer): Promise<ParsedPdfResult> {
        let parser: PdfParserInstance | undefined;

        try {
            parser = this.createParser(buffer);
            const result = await parser.getText({ pageJoiner: '' });
            const text = normalizePdfText(result.text);

            if (!text) {
                throw new PdfParsingException(
                    'CV_PDF_NO_TEXT',
                    'Không tìm thấy nội dung chữ trong tệp CV. Interviewly chưa hỗ trợ CV scan hoặc chỉ chứa hình ảnh.',
                );
            }

            if (text.length > MAX_EXTRACTED_CV_TEXT_LENGTH) {
                throw new PdfParsingException(
                    'CV_PDF_TEXT_TOO_LARGE',
                    'Nội dung chữ trong CV vượt quá giới hạn xử lý.',
                );
            }

            return { text };
        } catch (error) {
            if (error instanceof PdfParsingException) throw error;

            this.logger.warn('PDF parser không thể trích xuất nội dung CV.');
            throw new PdfParsingException(
                'CV_PDF_PARSE_FAILED',
                'Không thể đọc nội dung tệp PDF. Tệp có thể bị hỏng hoặc được bảo vệ bằng mật khẩu.',
            );
        } finally {
            if (parser) await this.destroyParser(parser);
        }
    }

    private async destroyParser(parser: PdfParserInstance): Promise<void> {
        try {
            await parser.destroy();
        } catch {
            this.logger.warn('Không thể giải phóng PDF parser sau khi xử lý.');
        }
    }
}
