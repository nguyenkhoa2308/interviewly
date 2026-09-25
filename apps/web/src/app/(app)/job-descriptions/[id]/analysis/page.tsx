import { JdAnalysisResultPage } from '@/components/job-description/jd-analysis-result-page';
export default async function JobDescriptionAnalysisPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <JdAnalysisResultPage id={id} />; }
