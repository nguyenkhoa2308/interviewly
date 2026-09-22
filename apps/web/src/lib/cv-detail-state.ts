import type { CvDetail } from '@/types/cv';

export type CvContentState =
    'UPLOADING' | 'PROCESSING' | 'FAILED' | 'READY' | 'READY_EMPTY';

export function getCvContentState(
    cv: Pick<CvDetail, 'processingStatus' | 'extractedText'>,
): CvContentState {
    if (cv.processingStatus !== 'READY') return cv.processingStatus;
    return cv.extractedText?.trim() ? 'READY' : 'READY_EMPTY';
}
