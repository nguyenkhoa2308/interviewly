import { InterviewPlanReviewPage } from '@/components/interview/interview-plan-review-page';
export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <InterviewPlanReviewPage id={id} />;
}
