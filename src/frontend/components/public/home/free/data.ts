export const freeContent = {
    heading: {
        line1: "Free.",
        line2: "You bring the key.",
    },
    description:
        "There is no plan to pick and no card to enter. Jobak itself costs nothing — you connect your own Groq API key during onboarding, and it does the ranking on your behalf.",
    primaryButton: {
        text: "Get started",
        href: "/register",
    },
    keyLinkText: "console.groq.com/keys",
    keyLinkHref: "https://console.groq.com/keys",
};

export interface IncludedItem {
    title: string;
    description: string;
}

export const included: IncludedItem[] = [
    {
        title: "Unlimited searches",
        description: "No quota and no cooldown — re-run your search whenever you want new matches.",
    },
    {
        title: "Full coverage",
        description: "Every job platform we support is included on every search — nothing is gated.",
    },
    {
        title: "The whole dashboard",
        description: "AI relevance scores, source filters, bookmarks and full job details included.",
    },
    {
        title: "No tiers, no trial",
        description: "Nothing is held back behind an upgrade, and nothing expires after a period.",
    },
];
