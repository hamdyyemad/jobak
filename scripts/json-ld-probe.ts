/**
 * Proves the JSON-LD serialiser cannot be broken out of.
 *
 * This was a real stored XSS on the public pages: `JSON.stringify` does not
 * escape `<`, and inside a `<script>` element the HTML parser looks for the
 * literal `</script` wherever it appears — including inside a JSON string.
 *
 * The payloads below are the reachable ones, not hypotheticals:
 *
 *   - a job title, which comes from a scraped third-party board, so anyone who
 *     can post a listing on Wuzzuf, Bayt or a company career site controls it;
 *   - a talent-directory display name, typed by any signed-up user.
 *
 *   npx tsx scripts/json-ld-probe.ts
 */
import { readFileSync } from "node:fs";
import { serializeJsonLd } from "../src/frontend/lib/utils/json-ld";

const LINE_SEPARATOR = " ";
const PARAGRAPH_SEPARATOR = " ";

const PAYLOADS: { label: string; value: string }[] = [
    { label: "closing script tag", value: `</script><img src=x onerror=alert(1)>` },
    { label: "uppercase variant", value: `</SCRIPT><svg onload=alert(1)>` },
    { label: "spaced variant", value: `</script >x` },
    { label: "html comment open", value: `<!--<script>` },
    { label: "nested script open", value: `<script>alert(1)</script>` },
    { label: "line separator U+2028", value: `a${LINE_SEPARATOR}b` },
    { label: "paragraph separator U+2029", value: `a${PARAGRAPH_SEPARATOR}b` },
    { label: "ordinary Arabic title", value: "مهندس برمجيات أول" },
    { label: "ordinary title with punctuation", value: "Mobile Engineer (iOS) — Senior" },
];

let failures = 0;

for (const { label, value } of PAYLOADS) {
    const out = serializeJsonLd({
        "@type": "JobPosting",
        title: value,
        hiringOrganization: { "@type": "Organization", name: value },
    });

    const problems: string[] = [];

    // The one that matters: nothing may close the element.
    if (/<\/script/i.test(out)) problems.push("output contains a literal </script");
    if (out.includes("<")) problems.push("output contains a raw '<'");
    if (out.includes(LINE_SEPARATOR) || out.includes(PARAGRAPH_SEPARATOR)) {
        problems.push("output contains a raw line separator");
    }

    // And it must still be valid JSON that round-trips to the original value —
    // escaping that mangles Arabic titles would be its own bug.
    try {
        if ((JSON.parse(out) as { title: string }).title !== value) {
            problems.push("value did not survive the round trip");
        }
    } catch (error) {
        problems.push(`output is not valid JSON: ${(error as Error).message}`);
    }

    if (problems.length) {
        failures += problems.length;
        console.log(`FAIL  ${label}`);
        for (const problem of problems) console.log(`        ${problem}`);
        console.log(`        got: ${out.slice(0, 140)}`);
    } else {
        console.log(`ok    ${label.padEnd(34)} escaped, valid JSON, round-trips`);
    }
}

/*
 * Guard against the fix being quietly undone. Every JSON-LD block on a public
 * page must go through `<JsonLd />`; a raw `JSON.stringify` into a script tag is
 * the bug returning.
 */
console.log("\nNo page may serialise JSON-LD by hand:");
const RAW = /dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify/;

for (const page of [
    "src/app/(public)/jobs/page.tsx",
    "src/app/(public)/jobs/[slug]/page.tsx",
    "src/app/(public)/talent/page.tsx",
]) {
    if (RAW.test(readFileSync(page, "utf8"))) {
        failures++;
        console.log(`FAIL  ${page} serialises JSON-LD inline — use <JsonLd data={…} />`);
    } else {
        console.log(`ok    ${page}`);
    }
}

console.log(`\n${failures === 0 ? "all clear" : `${failures} FAILURE(S)`}`);
process.exitCode = failures === 0 ? 0 : 1;
