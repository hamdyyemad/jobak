import { JobSource } from "../../core/JobSource.js";
import type {
    CollectionStrategy,
    ScrapedJob,
    SearchContext,
    SourceDescriptor,
    SourceKind,
} from "../../core/types.js";
import { matchesQuery } from "../../filters/relevance.js";
import { runActorSync } from "../../apify/client.js";
import type { ApifyActorSpec } from "../../apify/catalogue.js";

/**
 * An Apify actor, wearing the same clothes as every other source.
 *
 * The point of routing paid actors through `JobSource` rather than giving them
 * their own pipeline: they get the geography filter, the remote-eligibility
 * check, the description sanitiser, the freshness cut, per-source error
 * reporting and cross-source dedupe for free — all the things the previous
 * Apify path in n8n reimplemented by hand in a Code node, and mostly did not.
 *
 * Dedupe matters most. A user who enables both Bayt actors, or Wuzzuf via both
 * the free scraper and Apify, gets one row per job instead of three, and the
 * copy that survives is whichever source is registered first.
 */
export class ApifySource extends JobSource<Record<string, unknown>> {
    readonly descriptor: SourceDescriptor;
    protected readonly strategy: CollectionStrategy<Record<string, unknown>>;

    constructor(
        private readonly spec: ApifyActorSpec,
        token: string,
        /**
         * Seconds the actor may run. Deliberately a constructor argument: the
         * caller knows how much of the function budget is left, and an actor
         * given more time than the request has is an actor that bills for a run
         * whose results are thrown away.
         */
        timeoutSecs: number
    ) {
        super();

        this.descriptor = {
            key: spec.key,
            label: spec.label,
            kind: "apify" as SourceKind,
            geo: spec.countries === null ? "company" : "country",
            countries: spec.countries ?? undefined,
            language: spec.language,
            enabledByDefault: spec.enabledByDefault,
            note: `${spec.summary} ${spec.pricing.note}`,
        };

        this.strategy = {
            kind: "apify" as SourceKind,
            collect: (ctx) =>
                runActorSync({
                    token,
                    actorId: spec.actorId,
                    input: spec.buildInput(ctx),
                    /*
                     * The billing ceiling. Several of these actors charge per
                     * result, so the cap goes on the request rather than being
                     * applied to the response — trimming after the fact would
                     * mean paying for rows we then discard.
                     */
                    maxItems: ctx.limit,
                    timeoutSecs,
                    signal: ctx.signal,
                }),
        };
    }

    /**
     * Actors search server-side, so their rows already answer the query — but
     * several pad thin results with loosely related roles, and the user is
     * paying per row either way. Re-checking costs nothing.
     */
    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(row: Record<string, unknown>, ctx: SearchContext): ScrapedJob | null {
        return this.spec.mapRow(row, ctx);
    }
}
