/**
 * Shared shape for the feedback form.
 *
 * Separate from `backend/actions/feedback.ts` because that file is
 * `"use server"`, and a server-action module may only export async functions —
 * exporting a constant from it fails the build with an error that does not name
 * the constant.
 *
 * The categories live here rather than in the form so the server can validate
 * against the same list the user picked from, and the database `CHECK` in
 * `supabase/feedback.sql` holds the same values a third time. Three copies is
 * deliberate: the UI offers, the server verifies, the database enforces.
 */

export const FEEDBACK_CATEGORIES = [
    { value: "bug", label: "Something is broken", hint: "A page, a button, a search that fails" },
    { value: "listing", label: "A listing is wrong", hint: "Wrong location, filled, duplicate, spam" },
    { value: "feature", label: "I want something", hint: "A source, a filter, a language" },
    { value: "praise", label: "It worked", hint: "Tell us what helped — it decides what we build" },
    { value: "other", label: "Something else", hint: "" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 4000;

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
    return (
        typeof value === "string" &&
        FEEDBACK_CATEGORIES.some((category) => category.value === value)
    );
}
