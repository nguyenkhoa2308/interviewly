import { CvDetailShell } from '@/components/cv/cv-detail-shell';

export default async function CvDetailPage({
    params,
}: {
    params: Promise<{ cvId: string }>;
}) {
    const { cvId } = await params;
    return <CvDetailShell cvId={cvId} />;
}
