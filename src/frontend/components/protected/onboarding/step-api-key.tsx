"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { aiProviderOptions, apifyOption } from "./data";
import type { AiProvider, CredentialProvider, OnboardingData } from "@/frontend/types/on-boarding";
import { AiProviderMark } from "@/frontend/components/shared/ai-provider-marks";
import type { KeyCheck } from "@/frontend/hooks/protected/onboarding";
import { inputClass, labelClass } from "./styles";

interface StepApiKeyProps {
  aiProviders: AiProvider[];
  aiKeys: Partial<Record<AiProvider, string>>;
  apifyKey: string;
  statusOf: (provider: CredentialProvider) => KeyCheck;
  onVerify: (provider: CredentialProvider, apiKey: string) => void;
  onResetCheck: (provider: CredentialProvider) => void;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

interface KeyRowProps {
  provider: CredentialProvider;
  label: string;
  placeholder: string;
  consoleUrl: string;
  consoleLabel: string;
  tint: string;
  value: string;
  check: KeyCheck;
  onChange: (value: string) => void;
  onVerify: () => void;
}

/** One credential: the field, its Test button, and whatever the check said. */
function KeyRow({
  provider,
  label,
  placeholder,
  consoleUrl,
  consoleLabel,
  tint,
  value,
  check,
  onChange,
  onVerify,
}: KeyRowProps) {
  const checking = check.status === "checking";

  return (
    <div className="chip-in">
      <label htmlFor={`key-${provider}`} className={`${labelClass} flex items-center gap-2`}>
        {/* The provider's own mark, not a coloured square — same glyph the tiles use. */}
        <span style={{ color: tint }}>
          <AiProviderMark provider={provider} className="h-3.5 w-3.5" />
        </span>
        {label} key
      </label>

      <div className="flex items-end gap-3">
        <input
          id={`key-${provider}`}
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`${inputClass} font-mono text-[14px]`}
        />
        <button
          type="button"
          onClick={onVerify}
          disabled={!value.trim() || checking}
          className="shrink-0 border border-border-strong px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-tertiary transition-colors hover:border-(--sc-a) hover:text-(--fg-primary) disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border-strong disabled:hover:text-fg-tertiary"
        >
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
        </button>
      </div>

      <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.16em]">
        {check.status === "valid" && (
          <span className="chip-in flex items-center gap-1.5 text-(--sc-a)">
            <Check className="h-3 w-3" strokeWidth={3} />
            {check.detail ?? "Key verified"}
          </span>
        )}
        {check.status === "invalid" && (
          <span role="alert" className="chip-in flex items-center gap-1.5 text-(--status-rose)">
            <AlertCircle className="h-3 w-3" />
            {check.detail ?? "That key didn't work"}
          </span>
        )}
        {(check.status === "idle" || checking) && (
          <span className="text-fg-quaternary normal-case tracking-normal">
            Need one?{" "}
            <a
              href={consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-tertiary underline underline-offset-2 transition-colors hover:text-(--fg-primary)"
            >
              {consoleLabel}
            </a>
          </span>
        )}
      </p>
    </div>
  );
}

export function StepApiKey({
  aiProviders,
  aiKeys,
  apifyKey,
  statusOf,
  onVerify,
  onResetCheck,
  onUpdate,
}: StepApiKeyProps) {
  const toggleProvider = (provider: AiProvider) => {
    onUpdate({
      aiProviders: aiProviders.includes(provider)
        ? aiProviders.filter((p) => p !== provider)
        : [...aiProviders, provider],
    });
  };

  const setAiKey = (provider: AiProvider, value: string) => {
    // Editing the key invalidates whatever the last check proved about it.
    onResetCheck(provider);
    onUpdate({ aiKeys: { ...aiKeys, [provider]: value } });
  };

  const verifiedAiCount = aiProviders.filter((p) => statusOf(p).status === "valid").length;

  return (
    <div className="space-y-10">
      {/* ── Optional: extra coverage on top of the free sources ── */}
      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-fg-tertiary">
            Job collection
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary">
            Optional
          </span>
        </div>

        {/*
          A tile in the same language as the model grid, so Apify reads as a
          connected service rather than a stray text field. Not a button: there
          is nothing to toggle — leaving the key blank is how you decline it —
          so the tint stays on and the tile carries the explanation instead.
        */}
        <div
          className="relative flex items-center gap-4 px-4 py-4"
          style={{
            backgroundColor: `color-mix(in srgb, ${apifyOption.tint} 10%, var(--bg-canvas))`,
            boxShadow: `inset 0 -2px 0 ${apifyOption.tint}`,
          }}
        >
          <span style={{ color: apifyOption.tint }}>
            <AiProviderMark provider="apify" className="h-7 w-7" />
          </span>

          <span className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-(--fg-primary)">
              {apifyOption.label}
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-fg-quaternary">
              Adds LinkedIn and Indeed, which need residential IPs we don&apos;t have. Everything
              else is collected for free without it.
            </span>
          </span>

          {statusOf("apify").status === "valid" && (
            <span
              className="check-pop absolute right-2 top-2 flex h-4 w-4 items-center justify-center"
              style={{ backgroundColor: apifyOption.tint }}
            >
              <Check className="h-2.5 w-2.5 text-(--bg-canvas)" strokeWidth={4} />
            </span>
          )}
        </div>

        <KeyRow
          provider="apify"
          label={apifyOption.label}
          placeholder={apifyOption.placeholder}
          consoleUrl={apifyOption.consoleUrl}
          consoleLabel={apifyOption.consoleLabel}
          tint={apifyOption.tint}
          value={apifyKey}
          check={statusOf("apify")}
          onChange={(value) => {
            onResetCheck("apify");
            onUpdate({ apifyKey: value });
          }}
          onVerify={() => onVerify("apify", apifyKey)}
        />
      </section>

      {/* ── Required: at least one scoring model ───────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-fg-tertiary">
            Scoring model
          </h2>
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
              verifiedAiCount > 0 ? "text-fg-quaternary" : "text-(--sc-a)"
            }`}
          >
            {verifiedAiCount > 0 ? `${verifiedAiCount} connected` : "Pick at least one"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-px bg-border-subtle">
          {aiProviderOptions.map((provider) => {
            const selected = aiProviders.includes(provider.value);
            const check = statusOf(provider.value);
            return (
              <button
                key={provider.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleProvider(provider.value)}
                style={
                  selected
                    ? {
                        // 10% keeps four different brand colours civil on one dark
                        // canvas; the mark itself carries the full-strength hue.
                        backgroundColor: `color-mix(in srgb, ${provider.tint} 10%, var(--bg-canvas))`,
                        boxShadow: `inset 0 -2px 0 ${provider.tint}`,
                      }
                    : undefined
                }
                className={`relative flex flex-col items-center gap-3 bg-(--bg-canvas) px-3 py-6 transition-all duration-300 ${
                  selected ? "" : "hover:bg-white/2"
                }`}
              >
                <span
                  className="transition-colors duration-300"
                  style={{ color: selected ? provider.tint : "var(--fg-quaternary)" }}
                >
                  <AiProviderMark provider={provider.value} className="h-6 w-6" />
                </span>

                <span className="text-center">
                  <span
                    className={`block font-mono text-[10px] uppercase tracking-[0.16em] ${
                      selected ? "text-(--fg-primary)" : "text-fg-tertiary"
                    }`}
                  >
                    {provider.label}
                  </span>
                  <span className="mt-1 block text-[10px] text-fg-quaternary">{provider.model}</span>
                </span>

                {check.status === "valid" && (
                  <span
                    className="check-pop absolute right-2 top-2 flex h-4 w-4 items-center justify-center"
                    style={{ backgroundColor: provider.tint }}
                  >
                    <Check className="h-2.5 w-2.5 text-(--bg-canvas)" strokeWidth={4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {aiProviders.length === 0 && (
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary">
            Select a model above · nothing gets ranked without one
          </p>
        )}

        {aiProviderOptions
          .filter((provider) => aiProviders.includes(provider.value))
          .map((provider) => (
            <KeyRow
              key={provider.value}
              provider={provider.value}
              label={provider.label}
              placeholder={provider.placeholder}
              consoleUrl={provider.consoleUrl}
              consoleLabel={provider.consoleLabel}
              tint={provider.tint}
              value={aiKeys[provider.value] ?? ""}
              check={statusOf(provider.value)}
              onChange={(value) => setAiKey(provider.value, value)}
              onVerify={() => onVerify(provider.value, aiKeys[provider.value] ?? "")}
            />
          ))}
      </section>

      <p className="border-l border-border-standard py-1 pl-4 text-[12px] leading-relaxed text-fg-quaternary">
        Keys are encrypted before storage and never shared. Testing one checks the format here, then
        asks the provider to confirm it — no tokens or compute units are spent either way.
      </p>
    </div>
  );
}
