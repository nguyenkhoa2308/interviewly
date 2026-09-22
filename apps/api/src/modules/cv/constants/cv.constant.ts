export const MAX_CV_FILE_SIZE = 5 * 1024 * 1024;
export const PDF_MIME_TYPE = 'application/pdf';
export const PDF_SIGNATURE = '%PDF-';
export const MAX_EXTRACTED_CV_TEXT_LENGTH = 500_000;

export function getCvStorageKey(
    userId: string,
    cvId: string,
    versionId: string,
): string {
    return (
        'cvs/' +
        userId +
        '/' +
        cvId +
        '/versions/' +
        versionId +
        '/original.pdf'
    );
}
