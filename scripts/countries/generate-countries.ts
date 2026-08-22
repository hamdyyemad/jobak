/**
 * Generates the onboarding country list and copies the matching flag SVGs into
 * `public/flags/`.
 *
 * Names come from `Intl.DisplayNames` rather than a bundled name table, so they
 * stay in step with the ICU data Node ships. Flags come from
 * `country-flag-icons`; they are copied into `public/` rather than imported so
 * that only the flags actually displayed are ever fetched, and so the orb can
 * sample their colours from a same-origin canvas without tainting it.
 *
 * Usage: pnpm scripts  →  Countries  →  Regenerate
 */

import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * Excluded by product decision, not by data. Kept as a named constant so the
 * omission is obvious to the next reader rather than looking like a data bug.
 */
const EXCLUDED: string[] = ["IL"];

/**
 * In the flag set but not somewhere a person takes a job: supranational and
 * user-assigned codes (EU, XA "Pseudo-Accents" is a CLDR pseudolocale, XB), plus
 * territories with no permanent civilian population.
 *
 * Largely moot now that `MARKETS` is an allowlist, but kept so that widening
 * the allowlist later cannot quietly readmit them.
 */
const NOT_A_JOB_MARKET: string[] = [
    "EU", "XA", "XB",
    "AQ", "BV", "CP", "DG", "GS", "HM", "TF", "UM",
];

/**
 * The only markets Jobak serves: the Arab League, whose members are where our
 * users actually live.
 *
 * This is an allowlist rather than a filter over every country on earth,
 * because the product is for people in these markets looking for remote work —
 * either within the region or worldwide. Narrowing it here narrows the whole
 * chain: the onboarding dropdown, the `regions` table, and the geography the
 * collectors ask each source about.
 *
 * Note this constrains where the *candidate* is, never where the *job* is. A
 * worldwide remote search is still the common case.
 */
const MARKETS: string[] = [
    "AE", // United Arab Emirates
    "BH", // Bahrain
    "DZ", // Algeria
    "EG", // Egypt
    "IQ", // Iraq
    "JO", // Jordan
    "KM", // Comoros
    "KW", // Kuwait
    "LB", // Lebanon
    "LY", // Libya
    "MA", // Morocco
    "MR", // Mauritania
    "OM", // Oman
    "PS", // Palestine
    "QA", // Qatar
    "SA", // Saudi Arabia
    "SD", // Sudan
    "SO", // Somalia
    "SY", // Syria
    "TN", // Tunisia
    "YE", // Yemen
    "DJ", // Djibouti
];

const OUT_FILE = join(process.cwd(), "src/frontend/lib/configs/countries.ts");
const FLAG_DIR = join(process.cwd(), "public/flags");

function main() {
    const display = new Intl.DisplayNames(["en"], { type: "region" });

    // The shipped 3x2 directory is the source of truth for which flags exist.
    const flagSource = dirname(require.resolve("country-flag-icons/package.json"));
    const available = new Set(readdirSync(join(flagSource, "3x2")));

    const rows = [...available]
        .filter((file) => file.endsWith(".svg"))
        .map((file) => file.replace(/\.svg$/, ""))
        // Subdivision codes (GB-SCT, ES-CT) and user-assigned ranges (XC, XO) are
        // not countries — keep plain ISO 3166-1 alpha-2 only.
        .filter((code) => /^[A-Z]{2}$/.test(code))
        .filter((code) => MARKETS.includes(code))
        .filter((code) => !EXCLUDED.includes(code) && !NOT_A_JOB_MARKET.includes(code))
        .map((code) => {
            let name: string;
            try {
                name = display.of(code) ?? code;
            } catch {
                name = code;
            }
            return { code, name };
        })
        .filter((row) => row.name !== row.code)
        .sort((a, b) => a.name.localeCompare(b.name, "en"));

    // ── Flags ────────────────────────────────────────────────
    rmSync(FLAG_DIR, { recursive: true, force: true });
    mkdirSync(FLAG_DIR, { recursive: true });

    let copied = 0;
    for (const { code } of rows) {
        const file = `${code}.svg`;
        if (!available.has(file)) continue;
        copyFileSync(join(flagSource, "3x2", file), join(FLAG_DIR, file));
        copied++;
    }

    // ── Data file ────────────────────────────────────────────
    const body = rows
        .map(({ code, name }) => `    { code: "${code}", name: ${JSON.stringify(name)} },`)
        .join("\n");

    writeFileSync(
        OUT_FILE,
        `// GENERATED FILE — do not edit by hand.
// Regenerate with: pnpm scripts → Countries → Regenerate
// Source: country-flag-icons + Intl.DisplayNames.
// Scope: Arab League markets only — see MARKETS in scripts/countries/generate-countries.ts.
// ${EXCLUDED.join(", ")} excluded by product decision.

export interface Country {
    /** ISO 3166-1 alpha-2. Also the flag filename: /flags/{code}.svg */
    code: string;
    name: string;
}

export const countries: Country[] = [
${body}
];

/** "Anywhere" — the implicit choice for a remote-only search. */
export const WORLDWIDE = "WORLDWIDE";

export function flagUrl(code: string): string {
    return \`/flags/\${code}.svg\`;
}

export function countryName(code: string): string {
    return countries.find((c) => c.code === code)?.name ?? code;
}
`,
        "utf8"
    );

    console.log(`✓ ${rows.length} countries → src/frontend/lib/configs/countries.ts`);
    console.log(`✓ ${copied} flags → public/flags/`);
    if (EXCLUDED.length) console.log(`  excluded: ${EXCLUDED.join(", ")}`);
}

main();
