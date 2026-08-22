import type { ScrapedJob, SourceDescriptor } from "../../core/types.js";
import { AtsStrategy, type AtsRow } from "../../strategies/AtsStrategy.js";
import { clean, inferJobType, pick, toTimestamp } from "../../lib/normalize.js";
import { AtsBoardSource } from "./AtsBoard.js";

/**
 * The three systems that publish a company's open roles as JSON so the company
 * can embed its own board. Free, unauthenticated, and first-party.
 *
 * All three are on by default now. They were off before, which combined with an
 * empty slug list in the n8n config meant the highest-quality source available
 * had never returned a single row. Seed the slugs with MENA-hiring companies
 * and this becomes the best thing in the set — see the README.
 */

const descriptor = (key: string, label: string, note: string): SourceDescriptor => ({
    key,
    label,
    kind: "ats",
    geo: "company",
    language: "en",
    enabledByDefault: true,
    note,
});

export class GreenhouseSource extends AtsBoardSource {
    readonly descriptor = descriptor(
        "greenhouse",
        "Greenhouse boards",
        "Needs company slugs via the `ats` request field. `?content=true` returns full descriptions."
    );

    protected readonly strategy = new AtsStrategy({
        atsKey: "greenhouse",
        url: (slug) =>
            `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,
        extract: (payload) => (payload as { jobs?: Record<string, unknown>[] }).jobs ?? [],
    });

    protected toJob({ row, slug }: AtsRow): ScrapedJob {
        const location = clean(pick(row, ["location.name"], ""));

        return {
            title: clean(row.title),
            company: slug,
            location: location || "Not specified",
            job_type: inferJobType(row.title, location),
            description: String(row.content ?? ""),
            apply_url: clean(row.absolute_url),
            salary_text: null,
            posted_at_source: toTimestamp(pick(row, ["updated_at", "first_published"], null)),
            source_key: this.descriptor.key,
            external_id: String(row.id ?? ""),
        };
    }
}

export class AshbySource extends AtsBoardSource {
    readonly descriptor = descriptor(
        "ashby",
        "Ashby boards",
        "Needs company slugs via the `ats` request field. Reports the company name and remote flag itself."
    );

    protected readonly strategy = new AtsStrategy({
        atsKey: "ashby",
        url: (slug) =>
            `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`,
        extract: (payload) => (payload as { jobs?: Record<string, unknown>[] }).jobs ?? [],
    });

    protected toJob({ row, slug }: AtsRow): ScrapedJob {
        return {
            title: clean(row.title),
            company: clean(row.companyName) || slug,
            location: clean(row.location) || "Not specified",
            job_type: row.isRemote === true ? "remote" : inferJobType(row.title, row.location, row.employmentType),
            description: String(pick(row, ["descriptionPlain", "descriptionHtml"], "")),
            apply_url: clean(pick(row, ["jobUrl", "applyUrl"], "")),
            salary_text: clean(pick(row, ["compensation.compensationTierSummary"], "")) || null,
            posted_at_source: toTimestamp(pick(row, ["publishedAt", "updatedAt"], null)),
            source_key: this.descriptor.key,
            external_id: String(pick(row, ["id"], "")),
        };
    }
}

export class WorkableSource extends AtsBoardSource {
    readonly descriptor = descriptor(
        "workable",
        "Workable boards",
        "Needs company slugs via the `ats` request field. Widely used across MENA."
    );

    protected readonly strategy = new AtsStrategy({
        atsKey: "workable",
        url: (slug) =>
            `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true`,
        extract: (payload) => (payload as { jobs?: Record<string, unknown>[] }).jobs ?? [],
    });

    protected toJob({ row, slug }: AtsRow): ScrapedJob {
        /*
         * Workable's widget has no `location` field — it sends `city`, `state`
         * and `country` separately, and `telecommuting` rather than a job type.
         * Reading a `location` that was never there is how this source spent its
         * life reporting "Riyadh" as the whole address and every remote role as
         * on-site.
         */
        const location = [row.city, row.state, row.country]
            .map((part) => clean(part))
            .filter(Boolean)
            .join(", ");

        return {
            title: clean(row.title),
            company: slug,
            location: location || "Not specified",
            job_type: row.telecommuting === true ? "remote" : inferJobType(row.title, location, row.employment_type),
            description: String(row.description ?? ""),
            apply_url: clean(pick(row, ["url", "shortlink", "application_url"], "")),
            salary_text: null,
            posted_at_source: toTimestamp(pick(row, ["published_on", "created_at"], null)),
            source_key: this.descriptor.key,
            external_id: String(pick(row, ["shortcode", "id"], "")),
        };
    }
}
