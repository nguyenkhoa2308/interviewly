import { Logger } from '@nestjs/common';
import { jest } from '@jest/globals';

import { MAX_EXTRACTED_CV_TEXT_LENGTH } from '../constants/cv.constant';
import { PdfParserService } from './pdf-parser.service';
import type { PdfParserFactory, PdfParserInstance } from './pdf-parser.types';

describe('PdfParserService', () => {
    const getText = jest.fn<PdfParserInstance['getText']>();
    const destroy = jest.fn<PdfParserInstance['destroy']>();
    const parser: PdfParserInstance = { getText, destroy };
    const createParser = jest.fn<PdfParserFactory>(() => parser);
    const service = new PdfParserService(createParser);
    let loggerWarnSpy: jest.SpiedFunction<Logger['warn']>;

    beforeAll(() => {
        loggerWarnSpy = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        destroy.mockResolvedValue(undefined);
    });

    afterAll(() => loggerWarnSpy.mockRestore());

    it('passes the original Buffer to the parser factory and normalizes text', async () => {
        const buffer = Buffer.from('%PDF-document');
        getText.mockResolvedValue({
            text: '  Nguyen\r\n\r\n\r\nDuc\u0000   Khoa  ',
        });

        await expect(service.parse(buffer)).resolves.toEqual({
            text: 'Nguyen\n\nDuc Khoa',
        });
        expect(createParser).toHaveBeenCalledWith(buffer);
        expect(createParser.mock.calls[0][0]).toBe(buffer);
        expect(getText).toHaveBeenCalledWith({ pageJoiner: '' });
        expect(destroy).toHaveBeenCalledTimes(1);
    });

    it.each(['', '   \n\t  ', '\u0000\u0007'])(
        'rejects missing usable text: %j',
        async (text) => {
            getText.mockResolvedValue({ text });
            await expect(
                service.parse(Buffer.from('pdf')),
            ).rejects.toMatchObject({
                code: 'CV_PDF_NO_TEXT',
            });
            expect(destroy).toHaveBeenCalledTimes(1);
        },
    );

    it('rejects extracted text over the explicit safety limit', async () => {
        getText.mockResolvedValue({
            text: 'a'.repeat(MAX_EXTRACTED_CV_TEXT_LENGTH + 1),
        });
        await expect(service.parse(Buffer.from('pdf'))).rejects.toMatchObject({
            code: 'CV_PDF_TEXT_TOO_LARGE',
        });
    });

    it('maps corrupt/encrypted/library errors and destroys the parser', async () => {
        getText.mockRejectedValue(new Error('password or corrupt xref'));
        await expect(service.parse(Buffer.from('pdf'))).rejects.toMatchObject({
            code: 'CV_PDF_PARSE_FAILED',
            safeMessage: expect.not.stringContaining('xref'),
        });
        expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('does not fail successful parsing solely because destroy fails', async () => {
        getText.mockResolvedValue({ text: 'Valid CV text' });
        destroy.mockRejectedValue(new Error('destroy failed'));
        await expect(service.parse(Buffer.from('pdf'))).resolves.toEqual({
            text: 'Valid CV text',
        });
    });
});
