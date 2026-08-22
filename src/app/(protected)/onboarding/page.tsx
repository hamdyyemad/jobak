import { getJobCatalogue } from "@/backend/lib/job-catalogue";
import { OnboardingClient } from "@/frontend/components/protected/onboarding/onboarding-client";

/**
 * Server shell for the onboarding flow.
 *
 * The job title catalogue is database rows now, not a bundled constant, so it
 * is read here once per visit and handed to the client component. Fetching it
 * from the browser instead would mean the first two steps render before their
 * own options exist.
 *
 * Dynamic on purpose. Left to itself this page prerenders, which bakes the
 * catalogue into the build — a title added to the table would not appear until
 * the next deploy, and a build run before the tables exist would ship an empty
 * dropdown. `getJobCatalogue` caches in process, so this still costs at most
 * one query every five minutes per instance.
 */
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const catalogue = await getJobCatalogue();

  return <OnboardingClient catalogue={catalogue} />;
}
