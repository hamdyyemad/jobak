import { getUserJobs } from "@/backend/actions/jobs";
import { getUser } from "@/backend/actions/auth";
import { DashboardClient } from "@/frontend/components/protected/dashboard/dashboard-client";

export default async function DashboardPage() {
  const [initialJobs, user] = await Promise.all([getUserJobs(), getUser()]);
  const userName: string | undefined =
    user?.user_metadata?.full_name ?? user?.email ?? undefined;

  return <DashboardClient initialJobs={initialJobs} userName={userName} />;
}
