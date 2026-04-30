export interface Feature {
    number: string;
    title: string;
    description: string;
    visual: "ai" | "sources" | "filter" | "security";
}

export const features: Feature[] = [
    {
        number: "01",
        title: "AI-Powered Matching",
        description: "Our AI reads your skills, experience, and preferences then ranks every scraped job with a relevance score — so the best fits always rise to the top.",
        visual: "ai",
    },
    {
        number: "02",
        title: "Multi-Source Scraping",
        description: "We pull from LinkedIn, Indeed, RemoteOK, Wuzzuf, Glassdoor and more in real time. One search, every major board, zero manual browsing.",
        visual: "sources",
    },
    {
        number: "03",
        title: "Smart Filters",
        description: "Remote, hybrid, or on-site. Full-time, freelance, or contract. Filter by location, salary range, seniority level, and job type in one place.",
        visual: "filter",
    },
    {
        number: "04",
        title: "Secure & Private",
        description: "Your Grok API key is encrypted before storage and never shared. Your job preferences stay yours — we never sell your data.",
        visual: "security",
    },
];
