import type { ScrapedJob, SearchContext } from "../core/types.js";
import { inCountry } from "../lib/geo.js";
import { classifyScope, isReachable } from "./remote-eligibility.js";

/**
 * Keeps postings a candidate in one of the requested markets could actually take.
 *
 * Two ways to qualify, and only two:
 *
 *  - **Remote, and open to one of those markets.** Not merely "remote" — see
 *    `remote-eligibility.ts` for why that distinction is the whole point.
 *  - **Physically in a requested market.** A heuristic over the free-text
 *    location, deliberately generous — the AI scorer downstream does the
 *    precise judgement.
 *
 * Being generous into the shared pool is fine: `work_preference` on the
 * dashboard is what narrows it back down per user, so a remote role collected
 * for someone who only wants on-site is simply never shown to them.
 */
export function passesGeography(job: ScrapedJob, ctx: SearchContext, strictRemote = false): boolean {
    if (job.job_type === "remote") {
        return isReachable(classifyScope(job.location, job.description), ctx, strictRemote);
    }

    // A physical role with nowhere to anchor it to cannot be placed, and it is
    // not remote, so there is no candidate it could suit.
    if (ctx.countries.length === 0) return false;

    /*
     * Location only. The title used to be in here too, which is how "Senior
     * Solutions Engineer" matched Somalia — a job title says nothing about
     * where the job is.
     */
    const original = job.location ?? "";
    if (!original.trim()) return false;

    const lowered = original.toLowerCase();
    return ctx.countries.some((country) => inCountry(lowered, original, country));
}

/**
 * Records *why* a remote row passed, on the row.
 *
 * Without this the distinction the filter just drew is thrown away at the door,
 * and every consumer that wants "only roles open to anyone" has to re-parse the
 * location text and re-derive it.
 */
export function annotateScope(job: ScrapedJob): ScrapedJob {
    if (job.job_type !== "remote") return { ...job, remote_scope: null };
    return { ...job, remote_scope: classifyScope(job.location, job.description).kind };
}
