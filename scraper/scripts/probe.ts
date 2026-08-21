/**
 * Runs every adapter against the live sources and prints what came back.
 *
 * This is the check that matters for a scraper: the code compiling proves
 * nothing when the contract lives on someone else's server. Run it after any
 * adapter change, and whenever a source starts returning zero in production.
 *
 *   cd scraper && npx tsx scripts/probe.ts
 *   npx tsx scripts/probe.ts wuzzuf linkedin      # just these
 */
import { runSources, sources } from "../src/sources/index.js";
import type { ScrapeParams } from "../src/types.js";

const only = process.argv.slice(2);
const keys = only.length ? only : sources.map((s) => s.key);

/*
 * Two scenarios, because they exercise different paths: a country search makes
 * the geography filter do real work and brings Wuzzuf in, while a worldwide
 * remote search is what the remote-only boards are actually for.
 */
const scenario = process.env.SCENARIO === "country"
    ? {
        label: 'country search — "Backend Engineer" in Egypt',
        params: {
            query: "Backend Engineer",
            countries: [{ code: "EG", name: "Egypt" }],
            worldwide: false,
            workPreference: ["remote", "on-site"],
            limit: 5,
            ats: { greenhouse: ["stripe"], ashby: ["ramp"] },
        } satisfies ScrapeParams,
    }
    : {
        label: 'worldwide remote — "Engineer"',
        params: {
            query: "Engineer",
            countries: [],
            worldwide: true,
            workPreference: ["remote"],
            limit: 5,
            ats: { greenhouse: ["stripe"], ashby: ["ramp"] },
        } satisfies ScrapeParams,
    };

const params = scenario.params;
console.log("\nSCENARIO: " + scenario.label);
const { jobs, results } = await runSources(params, keys, 20_000);

console.log("\nSOURCE            OK    COUNT  TIME     NOTE");
console.log("─".repeat(78));
for (const r of results) {
    console.log(
        r.source.padEnd(17),
        (r.ok ? "yes" : "NO ").padEnd(5),
        String(r.count).padEnd(6),
        `${r.ms}ms`.padEnd(8),
        r.error ?? ""
    );
}

console.log(`\n${jobs.length} unique jobs after dedupe\n`);

// Field-level integrity: these are the values that hit typed Postgres columns.
const problems: string[] = [];
for (const j of jobs) {
    if (!j.apply_url) problems.push(`${j.source_key}: empty apply_url`);
    if (!j.title) problems.push(`${j.source_key}: empty title`);
    if (!["remote", "onsite", "hybrid"].includes(j.job_type)) {
        problems.push(`${j.source_key}: bad job_type ${j.job_type}`);
    }
    if (j.posted_at_source !== null && Number.isNaN(new Date(j.posted_at_source).getTime())) {
        problems.push(`${j.source_key}: unparseable date ${JSON.stringify(j.posted_at_source)}`);
    }
    if (/<[a-z]/i.test(j.description)) problems.push(`${j.source_key}: HTML left in description`);
}

for (const j of jobs.slice(0, 8)) {
    console.log(
        `  [${j.source_key}] ${j.title.slice(0, 46).padEnd(46)} ${j.company.slice(0, 20).padEnd(20)} ` +
        `${j.job_type.padEnd(7)} ${String(j.posted_at_source).slice(0, 10)}`
    );
}

console.log(`\nintegrity problems: ${problems.length}`);
for (const p of [...new Set(problems)]) console.log("  ! " + p);

const dead = results.filter((r) => !r.ok);
console.log(`sources failing:    ${dead.length}${dead.length ? " → " + dead.map((d) => d.source).join(", ") : ""}`);

process.exitCode = problems.length > 0 ? 1 : 0;
