import { redirect } from "next/navigation";
import { getJobCatalogue } from "@/backend/lib/job-catalogue";
import { getOnboardingProfile } from "@/backend/lib/onboarding-profile";
import { getUser } from "@/backend/actions/auth";
import { SettingsClient } from "@/frontend/components/protected/settings/settings-client";

/**
 * Settings.
 *
 * The job-matching answers live here as an ordinary form, not as the onboarding
 * wizard replayed — someone changing one country should not be walked back
 * through five steps to do it.
 *
 * Dynamic for the same reason the onboarding page is: the catalogue is database
 * rows, and prerendering would freeze it into the build.
 */
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [catalogue, profile, user] = await Promise.all([
    getJobCatalogue(),
    getOnboardingProfile(),
    getUser(),
  ]);

  // Nothing to configure until the first pass through onboarding has happened.
  if (!profile) redirect("/onboarding");

  return (
    <SettingsClient
      catalogue={catalogue}
      profile={profile}
      email={user?.email ?? undefined}
    />
  );
}
