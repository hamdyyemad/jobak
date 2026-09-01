/**
 * The four things a candidate needs between reading a posting and applying.
 *
 * Prompts live here rather than inline in the route so they can be read, and
 * argued with, as product copy. Three rules run through all of them:
 *
 *  - **Never invent experience.** The model gets the candidate's real profile
 *    and is told, explicitly, not to add to it. A cover letter that claims
 *    Kubernetes because the posting asked for it is worse than no cover letter:
 *    it fails at the interview, with the candidate holding it.
 *  - **Say what is missing.** The CV review's value is the gap list, so it is
 *    asked for directly rather than left to emerge.
 *  - **Match the posting's language.** A posting in Arabic gets Arabic back.
 *    Most of this product's users are applying in two languages, often to the
 *    same company.
 */

export type DocumentKind = "cv_review" | "cover_letter" | "hr_email" | "cv_bullets";

export interface DocumentContext {
    jobTitle?: string;
    company?: string;
    jobDescription: string;
    /** The candidate's own profile, from onboarding. */
    profile: {
        field?: string | null;
        jobTitles?: string[];
        skills?: string[];
        experience?: number;
        seniority?: string | null;
        location?: string | null;
    };
    /** Pasted CV text, when they have one. Optional everywhere. */
    cvText?: string;
}

export const DOCUMENT_LABELS: Record<DocumentKind, { title: string; blurb: string }> = {
    cv_review: {
        title: "CV review",
        blurb: "What to change in your CV for this specific role, and what is missing.",
    },
    cv_bullets: {
        title: "Tailored CV bullets",
        blurb: "Rewritten bullet points for this role, using only your real experience.",
    },
    cover_letter: {
        title: "Cover letter",
        blurb: "A short letter for this posting — specific, not a template.",
    },
    hr_email: {
        title: "Email to HR",
        blurb: "A brief, sendable email with a subject line.",
    },
};

const SYSTEM = `You are helping a job candidate apply for a specific role. You are careful, concrete and honest.

Hard rules:
- NEVER invent experience, employers, dates, degrees or skills the candidate did not state. If the posting wants something they lack, say so plainly rather than writing around it.
- Prefer specifics from the candidate's real profile over generic praise.
- No filler, no "I am writing to express my interest", no corporate cliché.
- Write in the language of the job description. If it is Arabic, answer in Arabic. If it is English, answer in English.
- Return plain text with simple line breaks. No markdown fences, no preamble, no closing commentary about what you produced.`;

function profileBlock(context: DocumentContext): string {
    const { profile, cvText } = context;

    const lines = [
        `Field: ${profile.field || "not stated"}`,
        `Target roles: ${(profile.jobTitles ?? []).join(", ") || "not stated"}`,
        `Skills: ${(profile.skills ?? []).join(", ") || "not stated"}`,
        `Experience: ${profile.experience ?? 0} years (${profile.seniority || "unspecified"})`,
        `Location: ${profile.location || "not stated"}`,
    ];

    if (cvText?.trim()) {
        // Capped: a pasted CV is occasionally an entire portfolio, and the
        // posting is the thing that has to fit in the context window.
        lines.push("", "CANDIDATE'S CV:", cvText.trim().slice(0, 6000));
    }

    return lines.join("\n");
}

function jobBlock(context: DocumentContext): string {
    const heading = [context.jobTitle, context.company].filter(Boolean).join(" at ");
    return [
        heading ? `ROLE: ${heading}` : "ROLE: (title not given)",
        "",
        "JOB DESCRIPTION:",
        context.jobDescription.trim().slice(0, 12000),
    ].join("\n");
}

const INSTRUCTIONS: Record<DocumentKind, string> = {
    cv_review: `Review this candidate against this specific posting. Structure the answer as:

MATCH — two or three sentences on how well they fit, and how confident you are.

STRENGTHS TO LEAD WITH — 3-5 bullets, each naming something from their profile that this posting explicitly asks for.

GAPS — 3-5 bullets. Be direct. For each, say whether it is a blocker, something they can address in the application, or something to learn. Do not soften a real gap.

CHANGES TO MAKE — concrete edits to their CV for this application. Name the section and what to change.`,

    cv_bullets: `Rewrite the candidate's experience as 5-7 CV bullet points aimed at this posting.

Every bullet must be traceable to something in their profile or CV — you may reframe and re-emphasise, never add. Lead with the outcome where they gave one, and use the posting's own vocabulary where it honestly applies. If their profile is too thin to produce a bullet, write fewer bullets rather than inventing one.

After the bullets, add one line beginning "NOT CLAIMED:" listing anything the posting wants that you deliberately did not assert.`,

    cover_letter: `Write a cover letter for this posting. Under 250 words.

Open with why this role specifically — reference something concrete from the posting. Middle: two or three of their most relevant real qualifications, with evidence. Close with a plain sentence about next steps.

No greeting placeholders like [Hiring Manager] unless the posting names nobody, in which case use "Hello". Do not restate their whole CV.`,

    hr_email: `Write a short email to send to the hiring contact about this role.

Format exactly as:
Subject: <one line, specific, no "Job Application">

<body, under 150 words>

The body should be skimmable in ten seconds: who they are, why this role, one concrete reason to talk, and a clear ask. Assume the CV is attached.`,
};

export function buildPrompt(kind: DocumentKind, context: DocumentContext): { system: string; prompt: string } {
    return {
        system: SYSTEM,
        prompt: [
            "CANDIDATE PROFILE:",
            profileBlock(context),
            "",
            jobBlock(context),
            "",
            "TASK:",
            INSTRUCTIONS[kind],
        ].join("\n"),
    };
}

/** Roughly how much room each kind needs. Cover letters run long if uncapped. */
export const MAX_TOKENS: Record<DocumentKind, number> = {
    cv_review: 1600,
    cv_bullets: 1200,
    cover_letter: 900,
    hr_email: 700,
};

export function isDocumentKind(value: unknown): value is DocumentKind {
    return typeof value === "string" && value in DOCUMENT_LABELS;
}
