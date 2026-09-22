import { CvAnalysisResultPage } from '@/components/cv/cv-analysis-result-page';

export default async function CvAnalysisPage({
    params,
}: {
    params: Promise<{ cvId: string }>;
}) {
    const { cvId } = await params;
    return <CvAnalysisResultPage cvId={cvId} />;
}
