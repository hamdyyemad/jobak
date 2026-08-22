import type { ScrapedJob } from "../core/types.js";
import { clean, pick, toTimestamp } from "./normalize.js";

/**
 * schema.org `JobPosting` → a listing.
 *
 * Written once and shared, because it turned out to be the contract that two of
 * the three international-facing MENA boards already publish. Bayt and
 * Talent.com both put a complete `JobPosting` on every detail page — title,
 * description, organisation, address, salary, posting date — for Google's
 * benefit, and a parser aimed at that is a parser aimed at something the site
 * maintains deliberately rather than at whatever its markup happened to look
 * like on the day it was written.
 *
 * https://schema.org/JobPosting
 */
export interface JobPostingResult {
    job: Omit<ScrapedJob, "source_key">;
    /** `hiringOrganization.sameAs`, when the publisher bothered to include it. */
    companyWebsite: string | null;
}

export function fromJobPosting(node: Record<string, unknown>, pageUrl: string): JobPostingResult | null {
    const title = clean(node.title ?? node.name);
    if (!title) return null;

    const org = asObject(node.hiringOrganization);
    const remote = isRemote(node);

    return {
        job: {
            title,
            company: clean(org?.name) || "Unknown",
            location: locationText(node, remote),
            job_type: remote ? "remote" : "onsite",
            description: String(node.description ?? ""),
            apply_url: clean(node.url) || pageUrl,
            salary_text: salaryText(node),
            posted_at_source: toTimestamp(node.datePosted ?? null),
            external_id: identifier(node) || pageUrl,
        },
        companyWebsite: clean(pick(org ?? {}, ["sameAs", "url"], "")) || null,
    };
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (Array.isArray(value)) return asObject(value[0]);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function isRemote(node: Record<string, unknown>): boolean {
    return String(node.jobLocationType ?? "").toUpperCase() === "TELECOMMUTE";
}

/**
 * The location text the eligibility filter will later read.
 *
 * For a remote role `applicantLocationRequirements` is the field that matters
 * and `jobLocation` is often just the employer's head office — a role listed at
 * a Berlin address that will hire anywhere in EMEA is not a Berlin role, and
 * reading the address first would mark it restricted to Germany.
 */
function locationText(node: Record<string, unknown>, remote: boolean): string {
    if (remote) {
        const requirements = toArray(node.applicantLocationRequirements)
            .map((entry) => clean(asObject(entry)?.name))
            .filter(Boolean);
        if (requirements.length) return requirements.join(", ");
    }

    const place = asObject(node.jobLocation);
    const address = asObject(place?.address);
    if (!address) return remote ? "Remote" : "";

    const parts = [address.addressLocality, address.addressRegion, address.addressCountry]
        .map((part) => clean(typeof part === "object" ? asObject(part)?.name : part))
        .map((part) => (/^[a-z]{2}$/.test(part) ? part.toUpperCase() : part))
        .filter(Boolean);

    /*
     * `addressCountry` is often an ISO code ("eg"), which is unreadable in a
     * job card and, lowercased, is exactly the two-letter substring the
     * geography matcher refuses to trust. Upper-case it so it reads as a code.
     */
    const text = parts.join(", ");
    return remote && text ? `Remote — ${text}` : text;
}

function salaryText(node: Record<string, unknown>): string | null {
    const base = asObject(node.baseSalary);
    if (!base) return null;

    const value = asObject(base.value);
    const min = value?.minValue ?? value?.value;
    const max = value?.maxValue;
    if (min === undefined || min === null || Number(min) <= 0) return null;

    const currency = clean(base.currency ?? value?.currency);
    const period = clean(value?.unitText);
    const range = max && Number(max) > Number(min) ? `${min} - ${max}` : String(min);

    return [range, currency, period].filter(Boolean).join(" ").trim() || null;
}

function identifier(node: Record<string, unknown>): string {
    const id = node.identifier;
    if (typeof id === "string") return clean(id);
    return clean(asObject(id)?.value);
}

function toArray(value: unknown): unknown[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}
