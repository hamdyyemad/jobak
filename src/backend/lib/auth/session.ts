import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/backend/lib/supabase/server";
import { logServerError } from "@/backend/lib/errors";

/**
 * The signed-in user, or null.
 *
 * Wrapped in React's `cache` so every component that needs auth state during a
 * single render shares one check instead of each paying for its own round trip.
 *
 * Failures resolve to null rather than throwing: this drives cosmetic decisions
 * on public marketing pages, and an unreachable auth service must not take the
 * homepage down with it. Actual route protection still lives in middleware.
 */
export const getCurrentUser = cache(async () => {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        // `cookies()` throws a DynamicServerError during static generation as a
        // control-flow signal. Swallowing it would hide the bail-out from Next,
        // so hand Next's own errors straight back before treating this as a fault.
        unstable_rethrow(error);
        logServerError("getCurrentUser", error);
        return null;
    }
});

/** Convenience wrapper for the many places that only need the boolean. */
export const isSignedIn = cache(async () => Boolean(await getCurrentUser()));
