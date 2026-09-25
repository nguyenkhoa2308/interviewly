import { JobDescriptionDetailPage } from '@/components/job-description/job-description-detail-page';

export default async function JobDescriptionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <JobDescriptionDetailPage id={id} />;
}
