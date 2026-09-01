"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { PageHeader } from "@/frontend/components/ui/page-header";
import { Button } from "@/frontend/components/ui/button";
import { Eyebrow, Section } from "@/frontend/components/ui/surface";
import { signOut } from "@/backend/actions/auth";
import type { JobField } from "@/frontend/lib/configs/job-titles";
import type { OnboardingProfile } from "@/backend/lib/onboarding-profile";
import type { ApifyCatalogue } from "@/backend/actions/apify";
import {
  useOnboardingForm,
  useKeyVerification,
} from "@/frontend/hooks/protected/onboarding";
import {
  StepWorkPreference,
  StepLocation,
  StepFieldSkills,
  StepJobPreferences,
  StepApiKey,
  StepApifyActors,
} from "@/frontend/components/protected/onboarding";
import { seniorityFromExperience } from "@/frontend/components/protected/onboarding/data";

interface SettingsClientProps {
  catalogue: JobField[];
  apifyCatalogue: ApifyCatalogue;
  profile: OnboardingProfile;
  email?: string;
}

type TabId = "matching" | "credentials" | "account";

const TABS: { id: TabId; label: string; blurb: string }[] = [
  {
    id: "matching",
    label: "Job matching",
    blurb: "What we look for, and where. Changing these changes what the collectors go and fetch.",
  },
  {
    id: "credentials",
    label: "Credentials",
    blurb:
      "The model key that scores your matches, the optional Apify token, and which paid sources it runs.",
  },
  { id: "account", label: "Account", blurb: "Your sign-in." },
];

/**
 * Settings, as tabs over the same preferences onboarding collects.
 *
 * The step components are reused rather than reimplemented — they are already
 * controlled inputs over `OnboardingData`, and a second copy of the country
 * picker or the skills manager would drift from the first within a release.
 * What changes here is the framing: everything for a tab on one page, with one
 * Save, instead of one question at a time behind Next.
 */
export function SettingsClient({ catalogue, apifyCatalogue, profile, email }: SettingsClientProps) {
  const [tab, setTab] = useState<TabId>("matching");
  const { data, updateData } = useOnboardingForm(profile.values);
  const { statusOf, verify, reset } = useKeyVerification();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const active = TABS.find((t) => t.id === tab)!;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/v1/webhook/job-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          seniority: data.seniority ?? seniorityFromExperience(data.experience),
          // Only keys actually retyped are sent. Blank means keep what is
          // stored — the API merges rather than overwrites.
          aiKeys: Object.fromEntries(
            data.aiProviders
              .map((provider) => [provider, data.aiKeys[provider]?.trim()])
              .filter(([, key]) => Boolean(key))
          ),
          apifyKey: data.apifyKey.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error ?? "We couldn't save that. Please try again.");
        return;
      }

      setSaved(true);
      // The dashboard reads preferences server-side, so its list is stale now.
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  /* Any edit invalidates the "Saved" confirmation from the previous save. */
  function edit(updates: Parameters<typeof updateData>[0]) {
    setSaved(false);
    updateData(updates);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-(--bg-canvas)">
      <div className="px-6 py-8">
        <PageHeader
          breadcrumb={["Dashboard", "Settings"]}
          title="Settings"
          backHref="/dashboard"
        />

        {/* Tabs */}
        <nav
          role="tablist"
          aria-label="Settings sections"
          className="-mt-4 flex gap-1 border-b border-border-subtle"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                tab === t.id
                  ? "border-accent text-fg-primary"
                  : "border-transparent text-fg-quaternary hover:text-fg-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <p className="mt-5 max-w-[62ch] text-[13px] leading-relaxed text-fg-tertiary">{active.blurb}</p>

        {/* `opt-quiet`: see globals.css — tones the onboarding rows down for a
            page that has no scene behind them. */}
        <div role="tabpanel" className="opt-quiet mt-8">
          {tab === "matching" && (
            <div className="space-y-12">
              <Section title="Work arrangement">
                <StepWorkPreference
                  workPreference={data.workPreference}
                  location={data.location}
                  onUpdate={edit}
                />
              </Section>

              <Section title="Where you're looking">
                <StepLocation location={data.location} onUpdate={edit} />
              </Section>

              <Section title="Field and skills">
                <StepFieldSkills
                  catalogue={catalogue}
                  field={data.field}
                  skills={data.skills}
                  experience={data.experience}
                  onUpdate={edit}
                />
              </Section>

              <Section title="Target roles">
                <StepJobPreferences
                  catalogue={catalogue}
                  jobType={data.jobType}
                  jobTitles={data.jobTitles}
                  seniority={data.seniority}
                  experience={data.experience}
                  field={data.field}
                  onUpdate={edit}
                />
              </Section>
            </div>
          )}

          {tab === "credentials" && (
            <div className="space-y-12">
              <StepApiKey
                savedProviders={profile.savedProviders}
                hasSavedApifyKey={profile.hasSavedApifyKey}
                aiProviders={data.aiProviders}
                aiKeys={data.aiKeys}
                apifyKey={data.apifyKey}
                statusOf={statusOf}
                onVerify={verify}
                onResetCheck={reset}
                onUpdate={edit}
              />

              <Section title="Paid sources">
                <StepApifyActors
                  catalogue={apifyCatalogue}
                  selected={data.apifyActors}
                  onChange={(apifyActors) => edit({ apifyActors })}
                  /*
                   * A token typed just now counts, and so does one already on
                   * file — the stored value is never sent to the browser, so
                   * `apifyKey` is blank for a user who has one saved.
                   */
                  hasToken={Boolean(data.apifyKey.trim()) || profile.hasSavedApifyKey}
                />
              </Section>
            </div>
          )}

          {tab === "account" && (
            <div className="space-y-8">
              <div>
                <Eyebrow>Signed in as</Eyebrow>
                <p className="mt-2 text-[15px] text-fg-secondary">{email ?? "—"}</p>
              </div>

              <form action={signOut}>
                <Button type="submit" variant="danger" size="lg">
                  Sign out
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* The account tab has nothing to save — its one action submits itself. */}
        {tab !== "account" && (
          <div className="mt-12 flex items-center gap-4 border-t border-border-subtle pt-6">
            {/*
              Was bordered with `--sc-a` — the onboarding *scene* tint, a
              variable scoped to that flow's animated colour transitions. It
              styled this button only by accident of being globally defined, and
              would have shifted the moment onboarding's palette was touched.
            */}
            <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? "Saving" : "Save changes"}
            </Button>

            {saved && !error && (
              <span
                role="status"
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary"
              >
                <Check className="size-3.5" />
                Saved · new matches score shortly
              </span>
            )}

            {error && (
              <span
                role="alert"
                className="rounded-control border border-status-rose/30 bg-status-rose/8 px-4 py-2 text-sm text-status-rose"
              >
                {error}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


