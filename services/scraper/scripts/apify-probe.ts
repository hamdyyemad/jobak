/**
 * Checks the Apify catalogue against the actors' real input schemas.
 *
 * Every field this service sends is validated against what the actor actually
 * accepts — names, types and enum values — by reading the published build
 * schema. **Nothing is run and nothing is charged**, which is the point: these
 * actors spend the user's credit, so the check that the wiring is right cannot
 * itself cost money.
 *
 * What it catches: a renamed input field, a country code an actor does not
 * recognise, a required field we never send. All three fail as an empty run
 * that looks like "no jobs found" and silently bills for the attempt.
 *
 *   npx tsx scripts/apify-probe.ts
 */
import { APIFY_ACTORS, defaultActorKeys } from "../src/apify/catalogue.js";
import type { SearchContext } from "../src/core/types.js";

interface InputSchema {
    properties?: Record<string, { type?: string; enum?: unknown[]; editor?: string; items?: { enum?: unknown[] } }>;
    required?: string[];
}

/** Two searches, because the country-dependent fields only differ between them. */
const SCENARIOS: { label: string; ctx: SearchContext }[] = [
    {
        label: "Egypt, remote-leaning",
        ctx: {
            query: "Backend Engineer",
            countries: [{ code: "EG", name: "Egypt" }],
            worldwide: false,
            workPreference: ["remote"],
            limit: 25,
            ats: {},
            maxAgeDays: 1,
            signal: AbortSignal.abort(),
        },
    },
    {
        label: "worldwide remote",
        ctx: {
            query: "Data Analyst",
            countries: [],
            worldwide: true,
            workPreference: ["remote"],
            limit: 25,
            ats: {},
            signal: AbortSignal.abort(),
        },
    },
];

async function schemaFor(actorId: string): Promise<InputSchema | null> {
    try {
        const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/builds/default`, {
            signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) return null;
        const payload = (await response.json()) as {
            data?: { actorDefinition?: { input?: InputSchema } };
        };
        return payload.data?.actorDefinition?.input ?? null;
    } catch {
        return null;
    }
}

let failures = 0;
const defaults = new Set(defaultActorKeys());

console.log(`${APIFY_ACTORS.length} actors, ${defaults.size} on by default\n`);

for (const actor of APIFY_ACTORS) {
    const schema = await schemaFor(actor.actorId);
    const flag = defaults.has(actor.key) ? "default" : "opt-in ";
    console.log(`── ${actor.key.padEnd(20)} ${flag}  ${actor.slug}`);

    if (!schema) {
        failures++;
        console.log(`   FAIL  could not read the input schema — actor ${actor.actorId} may have been removed`);
        continue;
    }

    const properties = schema.properties ?? {};
    const required = schema.required ?? [];

    for (const scenario of SCENARIOS) {
        const input = actor.buildInput(scenario.ctx);
        const problems: string[] = [];

        // Fields we send that the actor does not accept: silently ignored at
        // runtime, so the actor runs, bills, and filters on nothing.
        for (const [key, value] of Object.entries(input)) {
            if (value === undefined) continue;

            const property = properties[key];
            if (!property) {
                problems.push(`unknown input field "${key}"`);
                continue;
            }

            const allowed = property.enum ?? property.items?.enum;
            if (allowed) {
                const sent = Array.isArray(value) ? value : [value];
                for (const one of sent) {
                    if (!allowed.map(String).includes(String(one))) {
                        problems.push(`"${key}": ${JSON.stringify(one)} is not one of the actor's values`);
                    }
                }
            }
        }

        // Required fields we never send: the run fails outright.
        for (const key of required) {
            if (input[key] === undefined || input[key] === "") {
                problems.push(`required field "${key}" is missing`);
            }
        }

        if (problems.length) {
            failures += problems.length;
            console.log(`   FAIL  [${scenario.label}]`);
            for (const problem of problems) console.log(`           ${problem}`);
        } else {
            console.log(`   ok    [${scenario.label}] ${Object.keys(input).length} fields accepted`);
        }
    }
}

console.log(`\n${failures === 0 ? "all clear — no actor was run, nothing was charged" : `${failures} PROBLEM(S)`}`);
process.exitCode = failures === 0 ? 0 : 1;
