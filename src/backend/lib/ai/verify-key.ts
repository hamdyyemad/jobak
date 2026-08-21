import type { CredentialProvider } from "@/frontend/types/on-boarding";
import { checkKeyFormat } from "@/frontend/lib/configs/provider-keys";

export {
    AI_PROVIDERS,
    CREDENTIAL_PROVIDERS,
    isAiProvider,
    isCredentialProvider,
} from "@/frontend/lib/configs/provider-keys";

/**
 * Live check that a credential works, per provider.
 *
 * Every provider is probed with a read-only endpoint — model lists for the LLMs,
 * the account endpoint for Apify — rather than a completion or an actor run.
 * They are authenticated, so they prove the key is real and enabled, but they
 * consume no tokens and no compute units, and cost the user nothing.
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

const probes: Record<CredentialProvider, Probe> = {
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
    apify: {
        // Identifies the account behind the token. No actor is started, so this
        // spends nothing from the user's compute-unit allowance.
        url: "https://api.apify.com/v2/users/me",
        headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
};

export async function verifyKey(
    provider: CredentialProvider,
    apiKey: string
): Promise<KeyCheckResult> {
    const key = apiKey.trim();

    // Same rules the browser applied before sending. Re-run here because a
    // client-side check is a convenience for the user, never a control.
    const format = checkKeyFormat(provider, key);
    if (!format.ok) return { valid: false, detail: format.reason };

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
