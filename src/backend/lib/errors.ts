/**
 * Turns low-level failures into something a person can act on.
 *
 * Raw messages from Supabase and `fetch` ("fetch failed", "getaddrinfo ENOTFOUND
 * …supabase.co") leak infrastructure detail and tell the user nothing useful, so
 * nothing raw should reach the UI. The real error is still logged server-side by
 * `logServerError` — this only changes what gets shown.
 */

export const CONNECTION_MESSAGE =
    "We can't reach our servers right now. Check your connection and try again in a moment.";

export const GENERIC_MESSAGE = "Something went wrong on our end. Please try again.";

/** DNS / socket / offline failures, however they happen to be worded. */
const NETWORK_PATTERN =
    /fetch failed|failed to fetch|fetch error|networkerror|network request failed|enotfound|econnrefused|econnreset|etimedout|eai_again|getaddrinfo|socket hang up|und_err|aborted/i;

const NETWORK_CODE = /^(ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH)$/i;

interface ErrorLike {
    name?: string;
    message?: string;
    code?: string | number;
    status?: number;
    cause?: unknown;
}

/**
 * True when the request never reached the server — offline, DNS failure, refused
 * connection, or a Supabase project that no longer resolves.
 */
export function isConnectionError(error: unknown, depth = 0): boolean {
    if (!error || depth > 4) return false;

    if (typeof error === "string") return NETWORK_PATTERN.test(error);

    const e = error as ErrorLike;

    // Supabase wraps transport failures in this, always with status 0
    if (e.name === "AuthRetryableFetchError") return true;
    if (e.status === 0) return true;
    if (typeof e.code === "string" && NETWORK_CODE.test(e.code)) return true;
    if (typeof e.message === "string" && NETWORK_PATTERN.test(e.message)) return true;

    // `TypeError: fetch failed` carries the real reason on .cause
    return isConnectionError(e.cause, depth + 1);
}

/** Known Supabase auth messages, rewritten as something actionable. */
const KNOWN_MESSAGES: ReadonlyArray<readonly [RegExp, string]> = [
    [/invalid login credentials/i, "That email and password don't match an account."],
    [
        /email not confirmed/i,
        "Please confirm your email address first — check your inbox for the link.",
    ],
    [
        /user already registered|already been registered|already registered/i,
        "An account with that email already exists. Try signing in instead.",
    ],
    [/password should be at least/i, "That password is too short — use at least 8 characters."],
    [/weak password/i, "Please choose a stronger password."],
    [
        /rate limit|too many requests|over_email_send_rate/i,
        "Too many attempts. Wait a minute and try again.",
    ],
    [/invalid email|unable to validate email/i, "That email address doesn't look right."],
    [/email address .* is invalid/i, "That email address doesn't look right."],
];

/**
 * Maps any thrown or returned error to a message safe to show a user.
 * Never returns raw infrastructure detail.
 */
export function toUserMessage(error: unknown, fallback: string = GENERIC_MESSAGE): string {
    if (!error) return fallback;
    if (isConnectionError(error)) return CONNECTION_MESSAGE;

    const message =
        typeof error === "string" ? error : ((error as ErrorLike).message ?? "");

    for (const [pattern, friendly] of KNOWN_MESSAGES) {
        if (pattern.test(message)) return friendly;
    }

    return fallback;
}

/**
 * Logs the real error server-side so mapping it for the user does not cost us
 * the diagnostics. Connection failures get an explicit hint, because the usual
 * cause is configuration rather than a bug.
 */
export function logServerError(context: string, error: unknown): void {
    if (isConnectionError(error)) {
        console.error(
            `[${context}] Could not reach the backend. Check NEXT_PUBLIC_SUPABASE_URL ` +
            `points at a project that still exists, and that the host resolves.`,
            error
        );
        return;
    }
    console.error(`[${context}]`, error);
}
