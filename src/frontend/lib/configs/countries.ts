// GENERATED FILE — do not edit by hand.
// Regenerate with: pnpm scripts → Countries → Regenerate
// Source: country-flag-icons + Intl.DisplayNames.
// Scope: Arab League markets only — see MARKETS in scripts/countries/generate-countries.ts.
// IL excluded by product decision.

export interface Country {
    /** ISO 3166-1 alpha-2. Also the flag filename: /flags/{code}.svg */
    code: string;
    name: string;
}

export const countries: Country[] = [
    { code: "DZ", name: "Algeria" },
    { code: "BH", name: "Bahrain" },
    { code: "KM", name: "Comoros" },
    { code: "DJ", name: "Djibouti" },
    { code: "EG", name: "Egypt" },
    { code: "IQ", name: "Iraq" },
    { code: "JO", name: "Jordan" },
    { code: "KW", name: "Kuwait" },
    { code: "LB", name: "Lebanon" },
    { code: "LY", name: "Libya" },
    { code: "MR", name: "Mauritania" },
    { code: "MA", name: "Morocco" },
    { code: "OM", name: "Oman" },
    { code: "PS", name: "Palestinian Territories" },
    { code: "QA", name: "Qatar" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "SO", name: "Somalia" },
    { code: "SD", name: "Sudan" },
    { code: "SY", name: "Syria" },
    { code: "TN", name: "Tunisia" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "YE", name: "Yemen" },
];

/** "Anywhere" — the implicit choice for a remote-only search. */
export const WORLDWIDE = "WORLDWIDE";

export function flagUrl(code: string): string {
    return `/flags/${code}.svg`;
}

export function countryName(code: string): string {
    return countries.find((c) => c.code === code)?.name ?? code;
}
