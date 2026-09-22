export type PdfParsingErrorCode =
    'CV_PDF_PARSE_FAILED' | 'CV_PDF_NO_TEXT' | 'CV_PDF_TEXT_TOO_LARGE';

export type ParsedPdfResult = {
    text: string;
};

export interface PdfParserInstance {
    getText(options?: { pageJoiner?: string }): Promise<{ text: string }>;
    destroy(): Promise<void>;
}

export type PdfParserFactory = (buffer: Buffer) => PdfParserInstance;

export class PdfParsingException extends Error {
    constructor(
        readonly code: PdfParsingErrorCode,
        readonly safeMessage: string,
    ) {
        super(safeMessage);
        this.name = PdfParsingException.name;
    }
}
