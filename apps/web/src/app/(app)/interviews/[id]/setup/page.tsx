import { InterviewDeviceSetupPage } from '@/components/interview/interview-device-setup-page';

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <InterviewDeviceSetupPage id={id} />;
}
