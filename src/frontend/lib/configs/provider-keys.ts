import type { AiProvider, CredentialProvider } from "@/frontend/types/on-boarding";

/**
 * Key shape rules, shared by the browser and the server.
 *
 * Deliberately one module rather than two copies: the client checks the format
 * before spending a round trip, and the server checks it again because a client
 * check is a convenience, never a control. If these ever drifted apart, a key the
 * form accepted could be rejected by the API for reasons the user cannot see.
 */

export interface KeyRule {
    /** Prefix the provider issues. */
    pattern: RegExp;
    /** Shortest plausible real key, used to catch a half-pasted value. */
    minLength: number;
    /** Shown when the format is wrong. Describes the shape, never echoes the key. */
    hint: string;
}

export const keyRules: Record<CredentialProvider, KeyRule> = {
    anthropic: { pattern: /^sk-ant-/, minLength: 20, hint: "Claude keys start with sk-ant-" },
    openai: { pattern: /^sk-/, minLength: 20, hint: "OpenAI keys start with sk-" },
    gemini: { pattern: /^AIza/, minLength: 30, hint: "Gemini keys start with AIza" },
    groq: { pattern: /^gsk_/, minLength: 20, hint: "Groq keys start with gsk_" },
    apify: { pattern: /^apify_api_/, minLength: 20, hint: "Apify tokens start with apify_api_" },
};

export const AI_PROVIDERS: AiProvider[] = ["anthropic", "openai", "gemini", "groq"];

/** Every credential the flow collects — the four LLMs plus the scraper. */
export const CREDENTIAL_PROVIDERS: CredentialProvider[] = [...AI_PROVIDERS, "apify"];

export function isCredentialProvider(value: unknown): value is CredentialProvider {
    return typeof value === "string" && (CREDENTIAL_PROVIDERS as string[]).includes(value);
}

export function isAiProvider(value: unknown): value is AiProvider {
    return typeof value === "string" && (AI_PROVIDERS as string[]).includes(value);
}

export type FormatCheck = { ok: true } | { ok: false; reason: string };

/**
 * Cheap local check: is this even shaped like a key for this provider?
 *
 * Catches the common mistakes — pasting the wrong provider's key, pasting a
 * truncated value, or pasting whitespace — without a network call.
 */
export function checkKeyFormat(provider: CredentialProvider, key: string): FormatCheck {
    const trimmed = key.trim();
    const rule = keyRules[provider];

    if (!trimmed) return { ok: false, reason: "Enter a key first." };
    if (/\s/.test(trimmed)) return { ok: false, reason: "That key contains spaces — check the paste." };
    if (!rule.pattern.test(trimmed)) return { ok: false, reason: rule.hint };
    if (trimmed.length < rule.minLength) return { ok: false, reason: "That key looks truncated." };

    return { ok: true };
}
