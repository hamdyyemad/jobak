import type { AiProvider } from "@/frontend/types/on-boarding";

/**
 * One completion call, whichever provider the user connected.
 *
 * The n8n matcher already does this — four request shapes behind one HTTP node —
 * but that lives in a workflow's Code node and cannot be imported. This is the
 * same idea for the app: the document generator needs a model and should not
 * care which one, and neither should anything added after it.
 *
 * The key is the **user's own**, decrypted per request and never stored here.
 * That is the product's whole cost model: Jobak is free because the model spend
 * is theirs, billed at cost by their provider.
 */

export interface CompletionRequest {
    provider: AiProvider;
    apiKey: string;
    system: string;
    prompt: string;
    maxTokens?: number;
    signal?: AbortSignal;
}

/**
 * Preference-ordered models per provider — cheap, fast, good enough for prose.
 *
 * A list rather than a single id because providers retire models on their own
 * schedule and a hardcoded name eventually 404s in production with no warning:
 * Groq shut down llama-3.3-70b-versatile on 2026-08-16 and Google shut down
 * gemini-2.0-flash, both of which had been the defaults here. `complete` walks
 * this list when a model comes back unknown, so a retirement degrades to the
 * next-best model instead of a failed generation. First entry is the intended
 * one; the rest are fallbacks, so keep them ordered by preference.
 */
const MODEL_CANDIDATES: Record<AiProvider, string[]> = {
    anthropic: ["claude-sonnet-5"],
    openai: ["gpt-4o-mini", "gpt-5-mini"],
    gemini: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
};

export class AiError extends Error {
    constructor(
        message: string,
        /** Safe to show a user — never contains the key or provider internals. */
        readonly userMessage: string,
        readonly status?: number,
        /** The model was rejected, not the request — another model may work. */
        readonly retiredModel = false
    ) {
        super(message);
        this.name = "AiError";
    }
}

export async function complete(request: CompletionRequest): Promise<string> {
    const maxTokens = request.maxTokens ?? 2000;
    const candidates = MODEL_CANDIDATES[request.provider];

    let lastRetired: AiError | undefined;

    for (const model of candidates) {
        try {
            return await callModel(request, model, maxTokens);
        } catch (error) {
            /*
             * Only a retired or unavailable model is worth another attempt. A bad
             * key, a rate limit or an outage would fail identically on every
             * candidate, so those propagate immediately rather than burning the
             * user's remaining models on a request that cannot succeed.
             */
            if (error instanceof AiError && error.retiredModel) {
                lastRetired = error;
                continue;
            }
            throw error;
        }
    }

    throw (
        lastRetired ??
        new AiError(
            `no model configured for ${request.provider}`,
            "No usable model for your AI provider. Try switching provider in Settings."
        )
    );
}

/** One attempt against one model. Throws `AiError`; never retries. */
async function callModel(
    request: CompletionRequest,
    model: string,
    maxTokens: number
): Promise<string> {
    const { url, headers, body } = buildRequest(request, model, maxTokens);

    let response: Response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(body),
            signal: request.signal ?? AbortSignal.timeout(60_000),
        });
    } catch {
        throw new AiError(
            `network failure calling ${request.provider}`,
            "Couldn't reach your AI provider. Check your connection and try again.",
            undefined
        );
    }

    if (!response.ok) {
        /*
         * The status is what the user can act on, so it is translated here
         * rather than passed through. A 401 means their key is wrong — that is
         * fixable in Settings; a 429 means wait. The provider's own message is
         * kept out of the UI because it routinely names internal endpoints.
         */
        const detail = await response.text().catch(() => "");
        throw new AiError(
            `${request.provider} responded ${response.status} for ${model}: ${detail.slice(0, 300)}`,
            userMessageFor(response.status),
            response.status,
            isRetiredModel(response.status, detail)
        );
    }

    const payload = await response.json().catch(() => null);
    const text = extractText(payload);

    if (!text.trim()) {
        throw new AiError(
            `${request.provider} returned an empty completion`,
            "Your AI provider returned nothing. Try again, or switch provider in Settings."
        );
    }

    return text.trim();
}

/**
 * Did the provider reject the *model* rather than the request?
 *
 * All four answer a retired model with 404, but the status alone is ambiguous —
 * a wrong base path returns 404 too — so the body is checked for the marker each
 * provider uses. Matching loosely on purpose: a missed match costs one skipped
 * fallback, not a wrong error.
 */
function isRetiredModel(status: number, detail: string): boolean {
    if (status !== 404) return false;
    return /model_not_found|not_found_error|does not exist|is not found|was not found|decommissioned|deprecated/i.test(
        detail
    );
}

function userMessageFor(status: number): string {
    if (status === 401 || status === 403) {
        return "Your AI provider rejected the key. Check it in Settings.";
    }
    if (status === 429) {
        return "Your AI provider is rate-limiting you. Wait a moment and try again.";
    }
    if (status === 402) {
        return "Your AI provider reports no remaining credit on this key.";
    }
    if (status >= 500) {
        return "Your AI provider is having trouble right now. Try again shortly.";
    }
    return "Your AI provider refused the request. Try again, or switch provider in Settings.";
}

function buildRequest(
    request: CompletionRequest,
    model: string,
    maxTokens: number
): { url: string; headers: Record<string, string>; body: unknown } {
    switch (request.provider) {
        case "anthropic":
            return {
                url: "https://api.anthropic.com/v1/messages",
                headers: { "x-api-key": request.apiKey, "anthropic-version": "2023-06-01" },
                body: {
                    model,
                    max_tokens: maxTokens,
                    system: request.system,
                    messages: [{ role: "user", content: request.prompt }],
                },
            };

        case "gemini":
            return {
                // The key goes in a header, not the query string: a URL with a
                // credential in it ends up in logs and error messages.
                url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                headers: { "x-goog-api-key": request.apiKey },
                body: {
                    systemInstruction: { parts: [{ text: request.system }] },
                    contents: [{ role: "user", parts: [{ text: request.prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
                },
            };

        case "openai":
        case "groq":
        default:
            return {
                url:
                    request.provider === "openai"
                        ? "https://api.openai.com/v1/chat/completions"
                        : "https://api.groq.com/openai/v1/chat/completions",
                headers: { Authorization: `Bearer ${request.apiKey}` },
                body: {
                    model,
                    temperature: 0.7,
                    max_tokens: maxTokens,
                    messages: [
                        { role: "system", content: request.system },
                        { role: "user", content: request.prompt },
                    ],
                },
            };
    }
}

/** Pulls the text out of whichever envelope came back. */
function extractText(payload: unknown): string {
    if (!payload || typeof payload !== "object") return "";
    const record = payload as Record<string, unknown>;

    // Anthropic: { content: [{ type: "text", text }] }
    if (Array.isArray(record.content)) {
        return record.content
            .filter((block): block is { type: string; text: string } => {
                return Boolean(block) && typeof block === "object" && (block as { type?: string }).type === "text";
            })
            .map((block) => block.text)
            .join("");
    }

    // OpenAI / Groq: { choices: [{ message: { content } }] }
    const choices = record.choices;
    if (Array.isArray(choices) && choices[0]) {
        const first = choices[0] as { message?: { content?: string }; text?: string };
        return first.message?.content ?? first.text ?? "";
    }

    // Gemini: { candidates: [{ content: { parts: [{ text }] } }] }
    const candidates = record.candidates;
    if (Array.isArray(candidates) && candidates[0]) {
        const parts = (candidates[0] as { content?: { parts?: { text?: string }[] } }).content?.parts;
        if (Array.isArray(parts)) return parts.map((part) => part.text ?? "").join("");
    }

    return "";
}
