import { InterviewEvaluationReportPage } from '@/components/interview/interview-evaluation-report-page';

export default async function InterviewReportRoute({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <InterviewEvaluationReportPage id={id} />;
}
