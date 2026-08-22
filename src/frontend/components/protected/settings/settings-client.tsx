"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { signOut } from "@/backend/actions/auth";
import type { JobField } from "@/frontend/lib/configs/job-titles";
import type { OnboardingProfile } from "@/backend/lib/onboarding-profile";
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
} from "@/frontend/components/protected/onboarding";
import { seniorityFromExperience } from "@/frontend/components/protected/onboarding/data";

interface SettingsClientProps {
  catalogue: JobField[];
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
    blurb: "The model key that scores your matches, and the optional Apify token.",
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
export function SettingsClient({ catalogue, profile, email }: SettingsClientProps) {
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
    <div className="min-h-dvh bg-(--bg-canvas)">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-6 px-6 py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-(--fg-tertiary) transition-colors hover:text-(--fg-primary)"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <h1 className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg-quaternary">
            Settings
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Tabs */}
        <nav
          role="tablist"
          aria-label="Settings sections"
          className="flex gap-1 border-b border-border-subtle"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                tab === t.id
                  ? "border-(--fg-primary) text-(--fg-primary)"
                  : "border-transparent text-fg-quaternary hover:text-fg-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <p className="mt-5 text-[13px] text-fg-quaternary">{active.blurb}</p>

        <div role="tabpanel" className="mt-8">
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
          )}

          {tab === "account" && (
            <div className="space-y-8">
              <div>
                <p className={LABEL}>Signed in as</p>
                <p className="mt-2 text-[15px] text-fg-secondary">{email ?? "—"}</p>
              </div>

              <form action={signOut}>
                <button
                  type="submit"
                  className="border border-(--status-rose)/40 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-(--status-rose) transition-colors hover:bg-(--status-rose)/10"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>

        {/* The account tab has nothing to save — its one action submits itself. */}
        {tab !== "account" && (
          <div className="mt-12 flex items-center gap-4 border-t border-border-subtle pt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2.5 border border-(--sc-a) bg-(--sc-a)/12 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-(--fg-primary) transition-all hover:bg-(--sc-a)/22 disabled:cursor-not-allowed disabled:border-border-standard disabled:bg-transparent disabled:text-(--fg-quaternary)"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving" : "Save changes"}
            </button>

            {saved && !error && (
              <span
                role="status"
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary"
              >
                <Check className="h-3.5 w-3.5" />
                Saved · new matches score shortly
              </span>
            )}

            {error && (
              <span role="alert" className="text-sm text-(--status-rose)">
                {error}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const LABEL = "font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={`${LABEL} mb-5`}>{title}</h2>
      {children}
    </section>
  );
}
