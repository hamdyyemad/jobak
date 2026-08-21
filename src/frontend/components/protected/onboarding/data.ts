import { WorkPreference, JobType, Seniority, AiProvider } from "../../../types/on-boarding";

export const workOptions: { value: WorkPreference; label: string; description: string; icon: string }[] = [
    { value: "remote", label: "Remote", description: "Work from anywhere in the world", icon: "🌍" },
    { value: "on-site", label: "On-site", description: "Work from an office location", icon: "🏢" },
    { value: "hybrid", label: "Hybrid", description: "Mix of remote and on-site", icon: "⚡" },
];

export const jobTypeOptions: { value: JobType; label: string }[] = [
    { value: "full-time", label: "Full-time" },
    { value: "part-time", label: "Part-time" },
    { value: "freelance", label: "Freelance" },
    { value: "contract", label: "Contract" },
];

export const seniorityOptions: { value: Seniority; label: string; years: string }[] = [
    { value: "entry", label: "Entry Level", years: "0–2 years" },
    { value: "mid", label: "Mid Level", years: "2–5 years" },
    { value: "senior", label: "Senior Level", years: "5–10 years" },
    { value: "lead", label: "Lead / Staff", years: "10+ years" },
];

/**
 * Seniority is no longer asked for directly — step 3 already collects the exact
 * number of years, and asking twice was the same question in two costumes. The
 * derived value stays overridable, because titles and years diverge in practice.
 */
export function seniorityFromExperience(years: number): Seniority {
    if (years < 2) return "entry";
    if (years < 5) return "mid";
    if (years < 10) return "senior";
    return "lead";
}

/** Mono eyebrow above each heading — the frame's instrument labelling. */
export const stepKickers = [
    "Work mode",
    "Location",
    "Discipline",
    "Target role",
    "Compensation",
    "Intelligence",
];

export const stepTitles = [
    "How do you prefer to work?",
    "Where are you looking?",
    "What's your field?",
    "What are you looking for?",
    "Salary expectations",
    "Connect your AI",
];

export const stepDescriptions = [
    "Pick every arrangement you'd accept — you can choose more than one.",
    "We'll use this to surface the most relevant opportunities.",
    "Tell us your profession and the skills you bring.",
    "Define your ideal job type and the roles you're after.",
    "Help us filter opportunities within your range.",
    "Choose a provider and add its key — we'll verify it before you continue.",
];

export const currencyOptions = [
    { value: "USD", label: "USD", hint: "US Dollar ($)", keywords: "dollar united states" },
    { value: "EUR", label: "EUR", hint: "Euro (€)", keywords: "euro europe" },
    { value: "GBP", label: "GBP", hint: "British Pound (£)", keywords: "pound sterling uk" },
    { value: "EGP", label: "EGP", hint: "Egyptian Pound (E£)", keywords: "egypt" },
    { value: "AED", label: "AED", hint: "UAE Dirham (د.إ)", keywords: "emirates dubai" },
    { value: "SAR", label: "SAR", hint: "Saudi Riyal (﷼)", keywords: "saudi arabia" },
    { value: "CAD", label: "CAD", hint: "Canadian Dollar (C$)", keywords: "canada" },
    { value: "AUD", label: "AUD", hint: "Australian Dollar (A$)", keywords: "australia" },
    { value: "CHF", label: "CHF", hint: "Swiss Franc", keywords: "switzerland" },
    { value: "SEK", label: "SEK", hint: "Swedish Krona", keywords: "sweden" },
    { value: "INR", label: "INR", hint: "Indian Rupee (₹)", keywords: "india" },
    { value: "JPY", label: "JPY", hint: "Japanese Yen (¥)", keywords: "japan" },
    { value: "SGD", label: "SGD", hint: "Singapore Dollar (S$)", keywords: "singapore" },
    { value: "ZAR", label: "ZAR", hint: "South African Rand", keywords: "south africa" },
    { value: "NGN", label: "NGN", hint: "Nigerian Naira (₦)", keywords: "nigeria" },
    { value: "BRL", label: "BRL", hint: "Brazilian Real (R$)", keywords: "brazil" },
];

export const aiProviderOptions: {
    value: AiProvider;
    label: string;
    model: string;
    placeholder: string;
    /** Where the user goes to mint a key, linked from the card. */
    consoleUrl: string;
    consoleLabel: string;
    /** Brand colour, used for the card's selected state. */
    tint: string;
}[] = [
        {
            value: "anthropic",
            label: "Claude",
            model: "Anthropic",
            placeholder: "sk-ant-…",
            consoleUrl: "https://console.anthropic.com/settings/keys",
            consoleLabel: "console.anthropic.com",
            tint: "#d97757",
        },
        {
            value: "openai",
            label: "ChatGPT",
            model: "OpenAI",
            placeholder: "sk-…",
            consoleUrl: "https://platform.openai.com/api-keys",
            consoleLabel: "platform.openai.com",
            tint: "#10a37f",
        },
        {
            value: "gemini",
            label: "Gemini",
            model: "Google",
            placeholder: "AIza…",
            consoleUrl: "https://aistudio.google.com/app/apikey",
            consoleLabel: "aistudio.google.com",
            tint: "#4285f4",
        },
        {
            value: "groq",
            label: "Groq",
            model: "Groq Cloud",
            placeholder: "gsk_…",
            consoleUrl: "https://console.groq.com/keys",
            consoleLabel: "console.groq.com",
            tint: "#f55036",
        },
    ];

/**
 * Apify runs the actors that collect the listings, so it is required rather than
 * chosen — it sits in its own block in step 6, above the model picker.
 */
export const apifyOption = {
    value: "apify" as const,
    label: "Apify",
    model: "Job collection",
    placeholder: "apify_api_…",
    consoleUrl: "https://console.apify.com/settings/integrations",
    consoleLabel: "console.apify.com",
    // The orange from Apify's own symbol, so the tile's wash and underline sit
    // in the same palette as the logo rather than near it.
    tint: "#F86606",
};
