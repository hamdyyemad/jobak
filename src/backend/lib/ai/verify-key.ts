import type { AiProvider } from "@/frontend/types/on-boarding";

/**
 * Live check that an API key works, per provider.
 *
 * Every provider is probed with its *model list* endpoint rather than a
 * completion: listing models is authenticated, so it proves the key is real and
 * enabled, but it consumes no tokens and costs the user nothing. A key that can
 * list models is a key that can be used.
 *
 * Keys are never logged and never persisted by this path — the caller decides
 * whether to store them after a pass.
 */

export interface KeyCheckResult {
    valid: boolean;
    /** Safe to show the user. Never contains the key or provider internals. */
    detail: string;
}

const TIMEOUT_MS = 10_000;

interface Probe {
    url: string;
    headers: (key: string) => Record<string, string>;
}

const probes: Record<AiProvider, Probe> = {
    anthropic: {
        url: "https://api.anthropic.com/v1/models?limit=1",
        headers: (key) => ({
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        }),
    },
    openai: {
        url: "https://api.openai.com/v1/models",
        headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
    gemini: {
        url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
        headers: (key) => ({ "x-goog-api-key": key }),
    },
    groq: {
        url: "https://api.groq.com/openai/v1/models",
        headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
};

export const AI_PROVIDERS = Object.keys(probes) as AiProvider[];

export function isAiProvider(value: unknown): value is AiProvider {
    return typeof value === "string" && (AI_PROVIDERS as string[]).includes(value);
}

/** Obvious-shape rejects, so a typo never costs a round trip to the provider. */
const prefixes: Record<AiProvider, RegExp> = {
    anthropic: /^sk-ant-/,
    openai: /^sk-/,
    gemini: /^AIza/,
    groq: /^gsk_/,
};

export function looksLikeKey(provider: AiProvider, key: string): boolean {
    return prefixes[provider].test(key.trim());
}

export async function verifyKey(provider: AiProvider, apiKey: string): Promise<KeyCheckResult> {
    const key = apiKey.trim();

    if (!key) return { valid: false, detail: "No key provided." };
    if (!looksLikeKey(provider, key)) {
        return { valid: false, detail: "That doesn't look like a key for this provider." };
    }

    const probe = probes[provider];

    let response: Response;
    try {
        response = await fetch(probe.url, {
            method: "GET",
            headers: probe.headers(key),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch {
        // Timeout, DNS, refused connection — the key is unproven, not wrong.
        return { valid: false, detail: "Couldn't reach the provider. Try again in a moment." };
    }

    if (response.ok) return { valid: true, detail: "Key verified." };

    switch (response.status) {
        // Google answers a bad key with 400, not 401. The request carries nothing
        // but the key, so a 400 here can only mean the key was refused.
        case 400:
        case 401:
        case 403:
            return { valid: false, detail: "The provider rejected this key." };
        case 429:
            return { valid: false, detail: "The provider is rate-limiting this key. Try again shortly." };
        case 402:
            return { valid: false, detail: "The key is valid but the account has no credit." };
        default:
            return { valid: false, detail: `The provider returned an error (${response.status}).` };
    }
}
