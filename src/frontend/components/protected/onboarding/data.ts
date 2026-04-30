import { WorkPreference, JobType, Seniority } from "../../../types/on-boarding";

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

export const stepTitles = [
    "How do you prefer to work?",
    "Where are you located?",
    "What's your field?",
    "What are you looking for?",
    "Salary expectations",
    "Connect your AI",
];

export const stepDescriptions = [
    "Select your preferred work arrangement.",
    "We'll use this to surface the most relevant opportunities.",
    "Tell us your profession and the skills you bring.",
    "Define your ideal job type and seniority level.",
    "Help us filter opportunities within your range.",
    "Provide your Grok API key to power personalized matching.",
];

export const currencyOptions = [
    { value: "USD", label: "USD — US Dollar ($)" },
    { value: "EUR", label: "EUR — Euro (€)" },
    { value: "GBP", label: "GBP — British Pound (£)" },
    { value: "EGP", label: "EGP — Egyptian Pound (E£)" },
];
