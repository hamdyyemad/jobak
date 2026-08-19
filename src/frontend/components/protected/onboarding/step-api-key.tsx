"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { aiProviderOptions } from "./data";
import type { AiProvider, OnboardingData } from "@/frontend/types/on-boarding";
import { AiProviderMark } from "@/frontend/components/shared/ai-provider-marks";
import type { KeyCheck } from "@/frontend/hooks/protected/onboarding";
import { inputClass, labelClass } from "./styles";

interface StepApiKeyProps {
  aiProviders: AiProvider[];
  aiKeys: Partial<Record<AiProvider, string>>;
  statusOf: (provider: AiProvider) => KeyCheck;
  onVerify: (provider: AiProvider, apiKey: string) => void;
  onResetCheck: (provider: AiProvider) => void;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepApiKey({
  aiProviders,
  aiKeys,
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

  const setKey = (provider: AiProvider, value: string) => {
    // Editing the key invalidates whatever the last check proved about it.
    onResetCheck(provider);
    onUpdate({ aiKeys: { ...aiKeys, [provider]: value } });
  };

  return (
    <div className="space-y-8">
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
          Select at least one · nothing runs without a key
        </p>
      )}

      {aiProviderOptions
        .filter((provider) => aiProviders.includes(provider.value))
        .map((provider) => {
          const key = aiKeys[provider.value] ?? "";
          const check = statusOf(provider.value);
          const checking = check.status === "checking";

          return (
            <div key={provider.value} className="chip-in">
              <label htmlFor={`key-${provider.value}`} className={labelClass}>
                <span style={{ color: provider.tint }}>■</span> {provider.label} key
              </label>

              <div className="flex items-end gap-3">
                <input
                  id={`key-${provider.value}`}
                  type="password"
                  value={key}
                  onChange={(e) => setKey(provider.value, e.target.value)}
                  placeholder={provider.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  className={`${inputClass} font-mono text-[14px]`}
                />
                <button
                  type="button"
                  onClick={() => onVerify(provider.value, key)}
                  disabled={!key.trim() || checking}
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
                      href={provider.consoleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fg-tertiary underline underline-offset-2 transition-colors hover:text-(--fg-primary)"
                    >
                      {provider.consoleLabel}
                    </a>
                  </span>
                )}
              </p>
            </div>
          );
        })}

      <p className="border-l border-border-standard py-1 pl-4 text-[12px] leading-relaxed text-fg-quaternary">
        Keys are encrypted before storage and never shared. Testing one asks the provider to list its
        models — it proves the key works and costs you nothing.
      </p>
    </div>
  );
}
