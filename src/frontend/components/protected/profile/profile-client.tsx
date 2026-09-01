"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react";
import { PageHeader } from "@/frontend/components/ui/page-header";
import { Button } from "@/frontend/components/ui/button";
import { Field, Input, Textarea } from "@/frontend/components/ui/field";
import { Eyebrow } from "@/frontend/components/ui/surface";
import {
  saveProfile,
  setProfileVisibility,
  type MyProfile,
} from "@/backend/actions/talent";

interface ProfileClientProps {
  profile: MyProfile;
  /** What the card would show, pulled from onboarding answers. */
  preferences: { field: string | null; skills: string[]; experience: number; openTo: string[] };
}

/**
 * The page where someone decides whether to exist publicly.
 *
 * Built around one idea: **publishing is a separate, deliberate act from
 * filling the form in.** Everything above the switch is private no matter how
 * complete it is, the switch says exactly what will become visible, and turning
 * it off takes one click and removes the card immediately.
 *
 * The preview is not decoration. Someone should not have to publish in order to
 * find out what publishing shows.
 */
export function ProfileClient({ profile, preferences }: ProfileClientProps) {
  const [form, setForm] = useState(profile);
  const [saving, startSaving] = useTransition();
  const [publishing, startPublishing] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const edit = (patch: Partial<MyProfile>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  function handleSave() {
    setError(null);
    startSaving(async () => {
      const result = await saveProfile({
        displayName: form.displayName,
        headline: form.headline,
        bio: form.bio,
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl,
        websiteUrl: form.websiteUrl,
        locationLabel: form.locationLabel,
        showField: form.showField,
        showSkills: form.showSkills,
        showExperience: form.showExperience,
        showOpenTo: form.showOpenTo,
      });
      if (result.ok) setSaved(true);
      else setError(result.error ?? "Couldn't save.");
    });
  }

  function handleToggleVisibility() {
    setError(null);
    const next = !form.isPublic;

    startPublishing(async () => {
      // Save first: publishing what is on screen, not what was on screen at the
      // last save, is the only behaviour that is not a nasty surprise.
      if (next) {
        const saveResult = await saveProfile({
          displayName: form.displayName,
          headline: form.headline,
          bio: form.bio,
          linkedinUrl: form.linkedinUrl,
          githubUrl: form.githubUrl,
          websiteUrl: form.websiteUrl,
          locationLabel: form.locationLabel,
          showField: form.showField,
          showSkills: form.showSkills,
          showExperience: form.showExperience,
          showOpenTo: form.showOpenTo,
        });
        if (!saveResult.ok) {
          setError(saveResult.error ?? "Couldn't save.");
          return;
        }
      }

      const result = await setProfileVisibility(next);
      if (result.ok) edit({ isPublic: next });
      else setError(result.error ?? "Couldn't change visibility.");
    });
  }

  return (
    <main className="flex-1 overflow-y-auto bg-(--bg-canvas)">
      <div className="px-6 py-8">
        <PageHeader
          breadcrumb={["Dashboard", "Public profile"]}
          title="Public profile"
          description="Jobak has a public page where people looking for work can be found by employers. It is off until you turn it on, and nothing below is visible to anyone while it is off."
          backHref="/dashboard"
        />

        {/* ── The switch ───────────────────────────────────── */}
        <section
          className={`rounded-card border p-5 ${
            form.isPublic
              ? "border-accent/40 bg-accent/6"
              : "border-border-subtle bg-(image:--surface-1)"
          }`}
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium text-fg-primary">
                {form.isPublic ? <Eye className="size-4 text-accent" /> : <EyeOff className="size-4" />}
                {form.isPublic ? "Your profile is public" : "Your profile is private"}
              </p>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-fg-tertiary">
                {form.isPublic ? (
                  <>
                    Anyone can see your card on the talent page — no account needed. Your email is
                    never shown.{" "}
                    {form.slug && (
                      <Link
                        href="/talent"
                        className="inline-flex items-center gap-1 text-accent-text underline underline-offset-2"
                      >
                        View the page
                        <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </>
                ) : (
                  "Turning this on publishes the card previewed below. You can turn it off again at any time and the card disappears straight away."
                )}
              </p>
            </div>

            <Button
              variant={form.isPublic ? "secondary" : "primary"}
              size="lg"
              onClick={handleToggleVisibility}
              disabled={publishing}
              className="shrink-0"
            >
              {publishing && <Loader2 className="animate-spin" />}
              {form.isPublic ? "Make private" : "Publish my profile"}
            </Button>
          </div>
        </section>

        {/* ── Fields ───────────────────────────────────────── */}
        <section className="mt-12 space-y-6">
          <Eyebrow>Your card</Eyebrow>

          <Field label="Display name" hint="Shown as the card title. Your email is never published.">
            <Input
              value={form.displayName}
              onChange={(e) => edit({ displayName: e.target.value })}
              maxLength={80}
              placeholder="Hamdy Emad"
            />
          </Field>

          <Field label="Headline" hint="One line. What you do, and what you are looking for.">
            <Input
              value={form.headline}
              onChange={(e) => edit({ headline: e.target.value })}
              maxLength={140}
              placeholder="Backend engineer, 6 years — open to remote roles"
            />
          </Field>

          <Field label="About" hint="Optional. A short paragraph, up to 600 characters.">
            <Textarea
              value={form.bio}
              onChange={(e) => edit({ bio: e.target.value })}
              maxLength={600}
              rows={4}
            />
          </Field>

          <Field label="LinkedIn" hint="Must be a linkedin.com link. This is the main thing employers click.">
            <Input
              value={form.linkedinUrl}
              onChange={(e) => edit({ linkedinUrl: e.target.value })}
              placeholder="https://www.linkedin.com/in/your-handle"
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="GitHub" hint="Optional.">
              <Input
                value={form.githubUrl}
                onChange={(e) => edit({ githubUrl: e.target.value })}
                placeholder="https://github.com/you"
              />
            </Field>
            <Field label="Website" hint="Optional.">
              <Input
                value={form.websiteUrl}
                onChange={(e) => edit({ websiteUrl: e.target.value })}
                placeholder="https://yoursite.com"
              />
            </Field>
          </div>

          <Field label="Location" hint="Free text — as specific or vague as you like.">
            <Input
              value={form.locationLabel}
              onChange={(e) => edit({ locationLabel: e.target.value })}
              maxLength={80}
              placeholder="Cairo, Egypt"
            />
          </Field>
        </section>

        {/* ── What to reuse from onboarding ────────────────── */}
        <section className="mt-12">
          <Eyebrow>From your job preferences</Eyebrow>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-tertiary">
            These come from onboarding. Each is off or on independently — being in the directory is
            not the same as showing everything in it.
          </p>

          <div className="mt-5 space-y-2.5">
            <Toggle
              on={form.showField}
              onChange={(v) => edit({ showField: v })}
              label="Field"
              value={preferences.field ?? "Not set"}
            />
            <Toggle
              on={form.showSkills}
              onChange={(v) => edit({ showSkills: v })}
              label="Skills"
              value={preferences.skills.length ? preferences.skills.slice(0, 6).join(", ") : "Not set"}
            />
            <Toggle
              on={form.showExperience}
              onChange={(v) => edit({ showExperience: v })}
              label="Experience"
              value={preferences.experience ? `${preferences.experience} years` : "Not set"}
            />
            <Toggle
              on={form.showOpenTo}
              onChange={(v) => edit({ showOpenTo: v })}
              label="Open to"
              value={preferences.openTo.length ? preferences.openTo.join(", ") : "Not set"}
            />
          </div>
        </section>

        {error && (
          <p className="mt-8 rounded-control border border-status-rose/30 bg-status-rose/8 px-4 py-2.5 text-sm text-status-rose" role="alert">
            {error}
          </p>
        )}

        <div className="mt-10 flex items-center gap-4 border-t border-border-subtle pt-6">
          <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
          {saved && (
            <span
              role="status"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary"
            >
              <Check className="size-3.5" />
              Saved
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

function Toggle({
  on,
  onChange,
  label,
  value,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  label: string;
  value: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`flex w-full items-center gap-3 rounded-control border p-3.5 text-left transition-all ${
        on
          ? "border-accent/40 bg-accent/6"
          : "border-border-subtle bg-(image:--surface-1) hover:border-border-strong"
      }`}
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${
          on ? "border-accent bg-accent" : "border-border-strong"
        }`}
      >
        {on && <Check className="size-3 text-(--bg-canvas)" />}
      </span>
      <span className="w-24 shrink-0 text-[13px] font-medium text-fg-primary">{label}</span>
      <span className="truncate text-[13px] text-fg-tertiary">{value}</span>
    </button>
  );
}
