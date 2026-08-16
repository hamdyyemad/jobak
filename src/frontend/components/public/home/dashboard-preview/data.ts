export interface PreviewJob {
    title: string;
    company: string;
    location: string;
    remote: boolean;
    type: string;
    salary: string;
    score: number;
    source: string;
    postedAt: string;
    bookmarked: boolean;
}

/**
 * Mirrors the top of the dashboard's own match list so the landing page shows
 * the same shape of result a user actually gets. Keep in sync with
 * `protected/dashboard/data.ts` if that list changes.
 */
export const previewJobs: PreviewJob[] = [
    {
        title: "Senior Frontend Engineer",
        company: "Stripe",
        location: "Remote",
        remote: true,
        type: "full-time",
        salary: "$120k–$160k",
        score: 97,
        source: "LinkedIn",
        postedAt: "2h ago",
        bookmarked: false,
    },
    {
        title: "React Developer",
        company: "Linear",
        location: "Remote",
        remote: true,
        type: "full-time",
        salary: "$90k–$120k",
        score: 94,
        source: "RemoteOK",
        postedAt: "4h ago",
        bookmarked: true,
    },
    {
        title: "UI Engineer",
        company: "Figma",
        location: "Remote / SF",
        remote: true,
        type: "full-time",
        salary: "$110k–$150k",
        score: 88,
        source: "Indeed",
        postedAt: "8h ago",
        bookmarked: false,
    },
    {
        title: "Web Developer",
        company: "Wuzzuf Partner",
        location: "Cairo, Egypt",
        remote: false,
        type: "full-time",
        salary: "E£25k–E£40k",
        score: 76,
        source: "Wuzzuf",
        postedAt: "2d ago",
        bookmarked: false,
    },
];

/** The dashboard filters by source — these are the sources the workflow covers. */
export const previewFilters = [
    "all",
    "LinkedIn",
    "Indeed",
    "RemoteOK",
    "Wuzzuf",
    "Glassdoor",
    "Remotive",
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
        title: "Narrow by source",
        description:
            "Filter the list down to any single board — LinkedIn, Indeed, RemoteOK, Wuzzuf, Glassdoor or Remotive — or leave it on all and see everything at once.",
    },
    {
        number: "03",
        title: "Open, save, apply",
        description:
            "Select a match to expand the full description and why it scored well. Bookmark the ones worth keeping and follow the original posting to apply.",
    },
];
