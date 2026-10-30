import { redirect } from 'next/navigation';

export default async function InterviewReviewRoute({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/interviews/${id}/report#question-review`);
}