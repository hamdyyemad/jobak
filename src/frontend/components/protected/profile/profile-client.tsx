"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react";
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

const LABEL = "font-mono text-[11px] uppercase tracking-[0.22em] text-fg-quaternary";

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
    <main className="min-h-screen bg-(--bg-canvas)">
      <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-fg-tertiary hover:text-fg-primary mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        <h1 className="text-3xl font-display tracking-tight">Public profile</h1>
        <p className="mt-3 text-[15px] text-fg-secondary leading-relaxed max-w-xl">
          Jobak has a public page where people looking for work can be found by employers. It is off
          until you turn it on, and nothing below is visible to anyone while it is off.
        </p>

        {/* ── The switch ───────────────────────────────────── */}
        <section
          className={`mt-10 p-5 rounded-2xl border ${
            form.isPublic ? "border-accent/40 bg-accent/6" : "border-border-standard bg-white/2"
          }`}
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-fg-primary">
                {form.isPublic ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4" />}
                {form.isPublic ? "Your profile is public" : "Your profile is private"}
              </p>
              <p className="mt-1.5 text-sm text-fg-tertiary max-w-md leading-relaxed">
                {form.isPublic ? (
                  <>
                    Anyone can see your card on the talent page — no account needed. Your email is
                    never shown.{" "}
                    {form.slug && (
                      <Link
                        href="/talent"
                        className="text-accent underline underline-offset-2 inline-flex items-center gap-1"
                      >
                        View the page
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </>
                ) : (
                  "Turning this on publishes the card previewed below. You can turn it off again at any time and the card disappears straight away."
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleVisibility}
              disabled={publishing}
              className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                form.isPublic
                  ? "border border-border-standard text-fg-secondary hover:text-fg-primary hover:border-foreground/40"
                  : "bg-accent text-(--bg-canvas) hover:bg-accent-bright"
              }`}
            >
              {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.isPublic ? "Make private" : "Publish my profile"}
            </button>
          </div>
        </section>

        {/* ── Fields ───────────────────────────────────────── */}
        <section className="mt-12 space-y-6">
          <p className={LABEL}>Your card</p>

          <Field label="Display name" hint="Shown as the card title. Your email is never published.">
            <input
              value={form.displayName}
              onChange={(e) => edit({ displayName: e.target.value })}
              maxLength={80}
              placeholder="Hamdy Emad"
              className={INPUT}
            />
          </Field>

          <Field label="Headline" hint="One line. What you do, and what you are looking for.">
            <input
              value={form.headline}
              onChange={(e) => edit({ headline: e.target.value })}
              maxLength={140}
              placeholder="Backend engineer, 6 years — open to remote roles"
              className={INPUT}
            />
          </Field>

          <Field label="About" hint="Optional. A short paragraph, up to 600 characters.">
            <textarea
              value={form.bio}
              onChange={(e) => edit({ bio: e.target.value })}
              maxLength={600}
              rows={4}
              className={`${INPUT} resize-y`}
            />
          </Field>

          <Field label="LinkedIn" hint="Must be a linkedin.com link. This is the main thing employers click.">
            <input
              value={form.linkedinUrl}
              onChange={(e) => edit({ linkedinUrl: e.target.value })}
              placeholder="https://www.linkedin.com/in/your-handle"
              className={INPUT}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="GitHub" hint="Optional.">
              <input
                value={form.githubUrl}
                onChange={(e) => edit({ githubUrl: e.target.value })}
                placeholder="https://github.com/you"
                className={INPUT}
              />
            </Field>
            <Field label="Website" hint="Optional.">
              <input
                value={form.websiteUrl}
                onChange={(e) => edit({ websiteUrl: e.target.value })}
                placeholder="https://yoursite.com"
                className={INPUT}
              />
            </Field>
          </div>

          <Field label="Location" hint="Free text — as specific or vague as you like.">
            <input
              value={form.locationLabel}
              onChange={(e) => edit({ locationLabel: e.target.value })}
              maxLength={80}
              placeholder="Cairo, Egypt"
              className={INPUT}
            />
          </Field>
        </section>

        {/* ── What to reuse from onboarding ────────────────── */}
        <section className="mt-12">
          <p className={LABEL}>From your job preferences</p>
          <p className="mt-3 text-sm text-fg-tertiary max-w-xl leading-relaxed">
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
          <p className="mt-8 text-sm text-(--status-rose)" role="alert">
            {error}
          </p>
        )}

        <div className="mt-10 flex items-center gap-4 border-t border-border-subtle pt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-(--bg-canvas) font-semibold text-sm hover:bg-accent-bright transition-all disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-accent-text">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

const INPUT =
  "w-full rounded-xl border border-border-standard bg-white/2 px-3.5 py-2.5 text-[15px] text-fg-primary placeholder:text-fg-quaternary focus:border-accent/50 focus:outline-none transition-colors";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-fg-primary mb-1.5">{label}</label>
      {hint && <p className="text-xs text-fg-quaternary mb-2">{hint}</p>}
      {children}
    </div>
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
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
        on ? "border-accent/40 bg-accent/6" : "border-border-standard bg-white/2"
      }`}
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
          on ? "bg-accent border-accent" : "border-border-strong"
        }`}
      >
        {on && <Check className="w-3 h-3 text-(--bg-canvas)" />}
      </span>
      <span className="text-sm font-medium text-fg-primary w-24 shrink-0">{label}</span>
      <span className="text-sm text-fg-tertiary truncate">{value}</span>
    </button>
  );
}
