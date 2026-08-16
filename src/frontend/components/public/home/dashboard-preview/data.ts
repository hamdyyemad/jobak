export interface PreviewJob {
    title: string;
    company: string;
    location: string;
    remote: boolean;
    type: string;
    salary: string;
    score: number;
    postedAt: string;
    bookmarked: boolean;
}

/**
 * Illustrative rows only. Company names are deliberately generic and no
 * third-party platform is named anywhere in the marketing surface.
 */
export const previewJobs: PreviewJob[] = [
    {
        title: "Senior Frontend Engineer",
        company: "Acme Corp",
        location: "Worldwide",
        remote: true,
        type: "full-time",
        salary: "$120k–$160k",
        score: 97,
        postedAt: "2h ago",
        bookmarked: false,
    },
    {
        title: "React Developer",
        company: "Northwind",
        location: "Worldwide",
        remote: true,
        type: "full-time",
        salary: "$90k–$120k",
        score: 94,
        postedAt: "4h ago",
        bookmarked: true,
    },
    {
        title: "UI Engineer",
        company: "Lumen Labs",
        location: "Berlin, DE",
        remote: true,
        type: "full-time",
        salary: "$110k–$150k",
        score: 88,
        postedAt: "8h ago",
        bookmarked: false,
    },
    {
        title: "Web Developer",
        company: "Delta Systems",
        location: "Cairo, Egypt",
        remote: false,
        type: "full-time",
        salary: "E£25k–E£40k",
        score: 76,
        postedAt: "2d ago",
        bookmarked: false,
    },
];

/** Filters describe the match itself, never where it came from. */
export const previewFilters = [
    "all",
    "top matches",
    "remote",
    "full-time",
    "contract",
    "bookmarked",
];

export interface Highlight {
    number: string;
    title: string;
    description: string;
}

export const highlights: Highlight[] = [
    {
        number: "01",
        title: "Scored, not just listed",
        description:
            "Every match carries a 0–100 relevance score from the AI pass, and the list opens sorted by it. The strongest fit is always the first thing you read.",
    },
    {
        number: "02",
        title: "Narrow it down",
        description:
            "Filter to the roles worth your time — top-scoring matches only, remote work, a particular contract type, or just the ones you have already bookmarked.",
    },
    {
        number: "03",
        title: "Open, save, apply",
        description:
            "Select a match to expand the full description and why it scored well. Bookmark the ones worth keeping and follow the original posting to apply.",
    },
];
