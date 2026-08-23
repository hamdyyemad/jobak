/**
 * Checks the description sanitiser against markup that must not survive.
 *
 * Descriptions are arbitrary HTML from a dozen sites we do not control and end
 * up rendered in the job drawer, so this is the one piece of the service where
 * being wrong is a security bug rather than a bad row. Run it after any change
 * to `src/lib/sanitize.ts`.
 *
 *   npx tsx scripts/sanitize-probe.ts
 */
import { toSafeDescription, truncateHtml } from "../src/lib/sanitize.js";

interface Case {
    name: string;
    input: string;
    /** Substrings that must NOT appear in the output. */
    forbidden?: string[];
    /** Substrings that must appear. */
    required?: string[];
}

const CASES: Case[] = [
    {
        name: "script tag and its body",
        input: "<p>Real text</p><script>alert(document.cookie)</script>",
        forbidden: ["<script", "alert(", "document.cookie"],
        required: ["<p>Real text</p>"],
    },
    {
        name: "event handler attribute",
        input: `<p onclick="steal()" onmouseover='x()'>Click</p>`,
        forbidden: ["onclick", "onmouseover", "steal("],
        required: ["<p>Click</p>"],
    },
    {
        name: "javascript: href",
        input: `<a href="javascript:alert(1)">Apply</a>`,
        forbidden: ["javascript:", "<a "],
        required: ["Apply"],
    },
    {
        name: "obfuscated javascript: href",
        input: `<a href="java\nscript:alert(1)">Apply</a>`,
        forbidden: ["javascript:", "java\nscript", "<a "],
    },
    {
        name: "data: URI href",
        input: `<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>`,
        forbidden: ["data:", "<a "],
    },
    {
        name: "safe external link survives, with rel",
        input: `<a href="https://example.com/apply" class="btn" onclick="x()">Apply here</a>`,
        forbidden: ["onclick", "class="],
        required: [`href="https://example.com/apply"`, `rel="noopener noreferrer nofollow"`],
    },
    {
        name: "style block body removed",
        input: "<style>body{display:none}</style><p>Text</p>",
        forbidden: ["<style", "display:none"],
        required: ["<p>Text</p>"],
    },
    {
        name: "iframe removed",
        input: `<iframe src="https://evil.test"></iframe><p>Text</p>`,
        forbidden: ["<iframe", "evil.test"],
    },
    {
        name: "svg payload removed",
        input: `<svg><animate onbegin="alert(1)"/></svg><p>Text</p>`,
        forbidden: ["<svg", "onbegin", "alert("],
    },
    {
        name: "img onerror removed",
        input: `<img src=x onerror="alert(1)"><p>Text</p>`,
        forbidden: ["<img", "onerror", "alert("],
    },
    {
        name: "structure is preserved",
        input: "<h3>Requirements</h3><ul><li>5 years</li><li>Node.js</li></ul>",
        required: ["<h3>Requirements</h3>", "<ul>", "<li>5 years</li>", "<li>Node.js</li>"],
    },
    {
        name: "unknown tags drop but keep their text",
        input: `<div class="x"><span>Kept text</span></div>`,
        forbidden: ["<div", "<span", "class="],
        required: ["Kept text"],
    },
    {
        name: "plain text bullets become a list",
        input: "About the role\n\n- 5 years experience\n- Strong Node.js\n- Arabic a plus",
        required: ["<ul>", "<li>5 years experience</li>", "<li>Arabic a plus</li>"],
    },
    {
        name: "Arabic plain text keeps its structure",
        input: "المتطلبات\n\n• خبرة 5 سنوات\n• إجادة اللغة الإنجليزية",
        required: ["<ul>", "<li>خبرة 5 سنوات</li>"],
    },
    {
        name: "stray less-than is escaped, not read as a tag",
        input: "<p>Salary < 5000 EGP</p>",
        forbidden: ["< 5000"],
        required: ["&lt; 5000"],
    },
    {
        name: "uppercase and spaced tags are still caught",
        input: "< SCRIPT >alert(1)< / SCRIPT ><P>Text</P>",
        forbidden: ["alert(", "SCRIPT"],
    },
];

let failures = 0;

for (const testCase of CASES) {
    const output = toSafeDescription(testCase.input);
    const problems: string[] = [];

    for (const needle of testCase.forbidden ?? []) {
        if (output.includes(needle)) problems.push(`must not contain ${JSON.stringify(needle)}`);
    }
    for (const needle of testCase.required ?? []) {
        if (!output.includes(needle)) problems.push(`must contain ${JSON.stringify(needle)}`);
    }

    if (problems.length) {
        failures++;
        console.log(`FAIL  ${testCase.name}`);
        for (const problem of problems) console.log(`        ${problem}`);
        console.log(`        got: ${output.slice(0, 160)}`);
    } else {
        console.log(`ok    ${testCase.name}`);
    }
}

// Truncation must never leave a severed tag behind.
const long = toSafeDescription("<ul>" + "<li>Some fairly long requirement line</li>".repeat(60) + "</ul>");
for (const limit of [50, 120, 400, 1000]) {
    const cut = truncateHtml(long, limit);
    const opens = [...cut.matchAll(/<([a-z0-9]+)[^>]*>/gi)].length;
    const closes = [...cut.matchAll(/<\/([a-z0-9]+)>/gi)].length;
    const severed = /<[a-z0-9]*$/i.test(cut) || cut.includes("<li") === false && cut.includes("</li>");

    if (opens !== closes || severed) {
        failures++;
        console.log(`FAIL  truncateHtml(${limit}) left unbalanced markup: ${cut.slice(-60)}`);
    } else {
        console.log(`ok    truncateHtml(${limit}) balanced (${opens} tags)`);
    }
}

console.log(`\n${failures === 0 ? "all clear" : `${failures} FAILURE(S)`}`);
process.exitCode = failures === 0 ? 0 : 1;
