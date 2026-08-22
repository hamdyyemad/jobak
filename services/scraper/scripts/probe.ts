/**
 * Runs every source against the live sites and prints what came back.
 *
 * This is the check that matters for a scraper: the code compiling proves
 * nothing when the contract lives on someone else's server. Run it after any
 * source change, and first whenever a source starts returning zero in
 * production.
 *
 *   cd services/scraper
 *   npx tsx scripts/probe.ts                       # worldwide remote
 *   SCENARIO=mena npx tsx scripts/probe.ts         # Egypt + Saudi + UAE
 *   npx tsx scripts/probe.ts wuzzuf bayt           # just these
 *
 * The location histogram at the bottom is the point of the MENA scenario. A
 * search from Cairo used to come back full of `Remote Deutschland`, `LATAM` and
 * `Europe, Norway` — genuinely remote roles that would never hire from MENA —
 * and that table is where you see whether the eligibility filter is still
 * holding.
 */
import { runSearch } from "../src/core/pipeline.js";
import { registry } from "../src/sources/index.js";
import { classifyScope } from "../src/filters/remote-eligibility.js";
import type { SearchRequest } from "../src/core/types.js";

const only = process.argv.slice(2);
const sources = registry.selectFor(only.length ? only : undefined);

/*
 * ATS slugs so the highest-quality sources are exercised too. These are real
 * MENA-hiring companies — see the README for how the list is meant to grow.
 */
const ATS = {
    // Verified to return open roles at the time of writing. `swvl`, `instabug`,
    // `paymob` and `zid` all answer 200 with an empty `jobs` array — real
    // accounts, nothing open — which is the shape to expect from a slug list
    // that is doing its job.
    greenhouse: ["careem"],
    ashby: ["rain", "ramp"],
    workable: ["foodics", "swvl", "instabug"],
};

const SCENARIOS: Record<string, { label: string; request: SearchRequest }> = {
    mena: {
        label: 'MENA — "Backend Engineer" in Egypt, Saudi and the UAE',
        request: {
            query: "Backend Engineer",
            countries: [
                { code: "EG", name: "Egypt" },
                { code: "SA", name: "Saudi Arabia" },
                { code: "AE", name: "United Arab Emirates" },
            ],
            worldwide: false,
            workPreference: ["remote", "on-site"],
            limit: 8,
            ats: ATS,
        },
    },
    worldwide: {
        label: 'worldwide remote — "Engineer", hires-from-anywhere only',
        request: {
            query: "Engineer",
            countries: [],
            worldwide: true,
            workPreference: ["remote"],
            limit: 8,
            ats: ATS,
        },
    },
};

const scenario = SCENARIOS[process.env.SCENARIO ?? "worldwide"] ?? SCENARIOS.worldwide;

console.log(`\nSCENARIO: ${scenario.label}`);
console.log(`sources:  ${sources.map((source) => source.descriptor.key).join(", ")}\n`);

const { jobs, results } = await runSearch(scenario.request, sources, 20_000);

console.log("SOURCE            OK    KEPT   FETCHED  TIME      NOTE");
console.log("─".repeat(94));
for (const result of results) {
    console.log(
        result.source.padEnd(17),
        (result.ok ? "yes" : "NO ").padEnd(5),
        String(result.count).padEnd(6),
        String(result.fetched ?? "-").padEnd(8),
        `${result.ms}ms`.padEnd(9),
        result.error ?? ""
    );
}

console.log(`\n${jobs.length} unique jobs after dedupe\n`);

// Field-level integrity: these are the values that hit typed Postgres columns,
// and the insert downstream is bulk — one bad value fails a whole batch.
const problems: string[] = [];
for (const job of jobs) {
    if (!job.apply_url) problems.push(`${job.source_key}: empty apply_url`);
    if (!job.title) problems.push(`${job.source_key}: empty title`);
    if (!["remote", "onsite", "hybrid"].includes(job.job_type)) {
        problems.push(`${job.source_key}: bad job_type ${job.job_type}`);
    }
    if (job.posted_at_source !== null && Number.isNaN(new Date(job.posted_at_source).getTime())) {
        problems.push(`${job.source_key}: unparseable date ${JSON.stringify(job.posted_at_source)}`);
    }
    if (/<[a-z]/i.test(job.description)) problems.push(`${job.source_key}: HTML left in description`);
}

console.log("SAMPLE");
for (const job of jobs.slice(0, 12)) {
    console.log(
        `  [${job.source_key.padEnd(14)}] ${job.title.slice(0, 40).padEnd(40)} ` +
            `${job.company.slice(0, 18).padEnd(18)} ${job.job_type.padEnd(7)} ` +
            `${(job.remote_scope ?? "-").padEnd(10)} ${job.location.slice(0, 28)}`
    );
}

/*
 * Every distinct location that survived the filter, most common first. Read
 * this table, not the counts: a source can return plenty of jobs and still be
 * returning the wrong ones.
 */
console.log("\nLOCATIONS KEPT");
const byLocation = new Map<string, number>();
for (const job of jobs) {
    const key = `${job.location || "(blank)"}  [${job.remote_scope ?? "physical"}]`;
    byLocation.set(key, (byLocation.get(key) ?? 0) + 1);
}
for (const [location, count] of [...byLocation].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(`  ${String(count).padStart(3)}  ${location}`);
}

/*
 * A sanity check on the filter itself, independent of what the sources happened
 * to return today: these are the exact strings that were reaching the dashboard
 * before, and the expectation is what a candidate in MENA can actually take.
 */
console.log("\nELIGIBILITY SPOT-CHECK (worldwide search, so only hires-from-anywhere passes)");
const worldwideOnly: SearchRequest = { ...SCENARIOS.worldwide.request };
const SAMPLES = [
    "Anywhere in the World", "Worldwide", "Remote", "Remote Deutschland",
    "LATAM", "Americas, Europe, Israel", "Europe, Norway", "USA",
    "Remote (UTC+1 to UTC+2)", "EMEA", "Egypt", "Saudi Arabia",
];
for (const sample of SAMPLES) {
    const scope = classifyScope(sample);
    const { isReachable } = await import("../src/filters/remote-eligibility.js");
    const verdict = isReachable(scope, { ...worldwideOnly, signal: AbortSignal.abort() });
    console.log(`  ${verdict ? "keep" : "drop"}  ${scope.kind.padEnd(11)} ${sample}`);
}

console.log(`\nintegrity problems: ${problems.length}`);
for (const problem of [...new Set(problems)]) console.log("  ! " + problem);

const dead = results.filter((result) => !result.ok);
console.log(`sources failing:    ${dead.length}${dead.length ? " → " + dead.map((d) => d.source).join(", ") : ""}`);

process.exitCode = problems.length > 0 ? 1 : 0;
