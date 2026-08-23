import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { logServerError } from "@/backend/lib/errors";
import type { AiProvider, OnboardingData } from "@/frontend/types/on-boarding";

/**
 * What the onboarding form should open with.
 *
 * `null` for someone who has not onboarded — the form starts empty, as it
 * always did. For everyone else this is Settings: the same flow, prefilled, so
 * changing one answer does not mean re-entering all of them.
 */
export interface OnboardingProfile {
    /** Everything the form can safely round-trip. */
    values: Partial<OnboardingData>;
    /**
     * Which providers already have a key stored — names only.
     *
     * The keys themselves are never sent to the browser. They are encrypted at
     * rest precisely so that reading them back out is not something the app
     * does, and a form does not need the old value to replace it.
     */
    savedProviders: AiProvider[];
    hasSavedApifyKey: boolean;
}

export async function getOnboardingProfile(): Promise<OnboardingProfile | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const service = createServiceClient();

    const BASE =
        "work_preference, location, field, skills, experience, job_types, job_titles, seniority, ai_providers, ai_keys_encrypted, apify_key_encrypted, onboarding_completed";

    /*
     * `apify_actors` arrives with supabase/apify-marketplace.sql. Selecting a
     * column PostgREST does not know about fails the whole query, and a failed
     * query here reads as "no profile" — which bounces a fully onboarded user
     * back into onboarding. So the richer select is tried first and the
     * original is the fallback. Delete once the migration is applied.
     */
    let { data, error } = await service
        .from("user_preferences")
        .select(`${BASE}, apify_actors`)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        ({ data, error } = await service
            .from("user_preferences")
            .select(BASE)
            .eq("user_id", user.id)
            .maybeSingle());
    }

    if (error) {
        // A profile we cannot read is not a reason to block the form — it just
        // opens empty, which is the pre-existing behaviour.
        logServerError("onboarding-profile", error);
        return null;
    }

    if (!data?.onboarding_completed) return null;

    const stored = (data.ai_keys_encrypted ?? {}) as Record<string, unknown>;
    const savedProviders = (data.ai_providers ?? []).filter(
        (provider: string) => typeof stored[provider] === "string" && stored[provider]
    ) as AiProvider[];

    return {
        values: {
            workPreference: data.work_preference ?? [],
            location: {
                countries: data.location?.countries ?? [],
                worldwide: Boolean(data.location?.worldwide),
            },
            field: data.field ?? "",
            skills: data.skills ?? [],
            experience: data.experience ?? 0,
            jobType: data.job_types ?? [],
            jobTitles: data.job_titles ?? [],
            seniority: data.seniority ?? null,
            aiProviders: (data.ai_providers ?? []) as AiProvider[],
            apifyActors: (data as { apify_actors?: string[] }).apify_actors ?? [],
        },
        savedProviders,
        hasSavedApifyKey: Boolean(data.apify_key_encrypted),
    };
}
