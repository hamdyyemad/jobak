"use server";

import { headers } from "next/headers";
import { createClient } from "@/backend/lib/supabase/server";
import { logServerError } from "@/backend/lib/errors";
import { isFeedbackCategory, MESSAGE_MAX, MESSAGE_MIN } from "@/frontend/lib/configs/feedback";

/**
 * Receiving feedback from a public form.
 *
 * Written with the ordinary anon client, not the service role. The
 * "Anyone can submit feedback" policy in `supabase/feedback.sql` is what allows
 * the insert, and its `WITH CHECK` pins `status` and `user_id` — so a bug in
 * this file cannot mark a submission done or attribute it to someone else.
 * Using the service role here would silently discard both guarantees.
 */

export interface FeedbackInput {
    category: string;
    message: string;
    email?: string;
    pagePath?: string;
    /**
     * Honeypot. A real form leaves it empty because it is hidden; most bots fill
     * every field they find.
     */
    website?: string;
    /** When the form was opened, from the client. See the speed check below. */
    openedAt?: number;
}

export interface FeedbackResult {
    ok: boolean;
    error?: string;
}

/**
 * Per-instance, in-memory. Enough to stop a held-down button or a stuck retry.
 *
 * It resets on deploy and does not span instances, so it is not the real
 * defence — the `feedback_flood` trigger in Postgres is, because that one holds
 * wherever the request lands.
 */
const MIN_INTERVAL_MS = 20_000;
const lastSubmission = new Map<string, number>();

/**
 * A plausible address, or nothing.
 *
 * Deliberately loose: this field is optional and exists only so a reply is
 * possible. Rejecting a valid-but-unusual address would cost a bug report to
 * satisfy a regex, so anything with a shape is accepted and anything without is
 * dropped rather than refused.
 */
function cleanEmail(value: string | undefined): string | null {
    const raw = (value ?? "").trim();
    if (!raw || raw.length > 200) return null;
    return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(raw) ? raw : null;
}

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
    // Silently accepted, never stored. Telling a bot it was caught only helps it.
    if (input.website?.trim()) return { ok: true };

    /*
     * A human cannot read the page, choose a category and write ten words in
     * under three seconds. A bot that posts the form the instant it parses it
     * can.
     */
    const openedAt = Number(input.openedAt);
    if (Number.isFinite(openedAt) && Date.now() - openedAt < 3_000) return { ok: true };

    if (!isFeedbackCategory(input.category)) {
        return { ok: false, error: "Pick what this is about." };
    }

    const message = (input.message ?? "").trim();
    if (message.length < MESSAGE_MIN) {
        return { ok: false, error: `A little more detail, please — at least ${MESSAGE_MIN} characters.` };
    }
    if (message.length > MESSAGE_MAX) {
        return { ok: false, error: `That is longer than we can store. Keep it under ${MESSAGE_MAX} characters.` };
    }

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        /*
         * Keyed by the signed-in user, or by the forwarded IP for anonymous
         * senders. That header is set by the platform proxy and is not
         * trustworthy on its own — which is exactly why the database trigger
         * sits behind this.
         */
        const requestHeaders = await headers();
        const key =
            user?.id ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

        const since = Date.now() - (lastSubmission.get(key) ?? 0);
        if (since < MIN_INTERVAL_MS) {
            return { ok: false, error: "That came through. Give it a moment before sending another." };
        }

        const { error } = await supabase.from("feedback").insert({
            category: input.category,
            message,
            email: cleanEmail(input.email),
            page_path: (input.pagePath ?? "").slice(0, 300) || null,
            user_id: user?.id ?? null,
            status: "new",
        });

        if (error) {
            // The flood trigger raises a check violation; that is a "slow down",
            // not a fault, and the sender should be told which.
            if (error.code === "23514" || /too many submissions/i.test(error.message)) {
                return { ok: false, error: "We're getting a lot at once. Try again in a minute." };
            }

            logServerError("feedback:insert", error);
            return { ok: false, error: "Couldn't send that. Please try again." };
        }

        lastSubmission.set(key, Date.now());
        return { ok: true };
    } catch (error) {
        logServerError("feedback:submit", error);
        return { ok: false, error: "Couldn't send that. Please try again." };
    }
}
