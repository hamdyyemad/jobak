/**
 * Talking to Apify.
 *
 * Apify is the one paid thing in this service, and it is paid with the *user's*
 * token and the user's credit. Two consequences run through everything here:
 *
 *  - **Nothing runs unasked.** No scheduled path may call an actor. The
 *    dashboard's Search button and onboarding are the only triggers, which is
 *    also why the token is passed in per request rather than configured.
 *  - **Cost is capped before the run starts, not after.** `maxItems` is sent on
 *    every call, because several of these actors bill per result and an actor
 *    that decides to return 2,000 rows would otherwise bill for 2,000 rows.
 */
import { fetchJson } from "../lib/http.js";

const API = "https://api.apify.com/v2";

export interface ApifyRunOptions {
    token: string;
    actorId: string;
    input: Record<string, unknown>;
    /** Hard ceiling on billed dataset items. */
    maxItems: number;
    /** Seconds the actor may run before Apify aborts it. */
    timeoutSecs: number;
    signal: AbortSignal;
}

/**
 * Runs an actor and returns its dataset in one call.
 *
 * `run-sync-get-dataset-items` is the only shape that fits a serverless
 * function: start-then-poll needs somewhere to poll from. The trade is that the
 * whole run must finish inside our own function budget, so `timeoutSecs` is
 * kept well under it and a slow actor loses its results rather than the
 * response.
 *
 * Actor cold starts are the reason these numbers look generous — an actor that
 * has not run recently routinely spends 10-20 seconds booting before it fetches
 * anything.
 */
export async function runActorSync(options: ApifyRunOptions): Promise<Record<string, unknown>[]> {
    const url =
        `${API}/acts/${encodeURIComponent(options.actorId)}/run-sync-get-dataset-items` +
        `?token=${encodeURIComponent(options.token)}` +
        `&maxItems=${options.maxItems}` +
        `&timeout=${options.timeoutSecs}` +
        `&format=json`;

    const items = await fetchJson<unknown>(url, options.signal, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(options.input),
        /*
         * Apify is an API we are a paying client of, not a site we crawl, and
         * its robots.txt governs its website rather than its API. Running the
         * crawl gates here would add a robots fetch to every actor run for no
         * benefit — and the throttle would misread a long actor run as the host
         * being slow and start pacing us.
         */
        skipRobots: true,
        // A little past the actor's own timeout, so Apify aborts the run and
        // answers rather than us giving up on a run that is still billing.
        timeoutMs: (options.timeoutSecs + 8) * 1000,
    });

    if (!Array.isArray(items)) return [];
    return items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

/** Whether a token is real, without spending anything. */
export async function verifyToken(token: string, signal: AbortSignal): Promise<boolean> {
    try {
        await fetchJson(`${API}/users/me?token=${encodeURIComponent(token)}`, signal, {
            timeoutMs: 6_000,
            skipRobots: true,
        });
        return true;
    } catch {
        return false;
    }
}
