import { createServiceClient } from "@/backend/lib/supabase/service";
import { logServerError } from "@/backend/lib/errors";
import type { JobField } from "@/frontend/lib/configs/job-titles";

/**
 * The job title catalogue, from the database.
 *
 * It used to be a generated TypeScript file, which forced the collector to ask
 * the app for a list the app was only reading out of its own bundle. It lives
 * in `job_fields` / `job_titles` now, so the onboarding form and the hourly
 * sweep read the same rows and cannot drift apart.
 *
 * Reference data, so it is cached for the process rather than fetched per
 * render — the onboarding form asks for it on every visit and it changes about
 * as often as the product does.
 */
let cached: { at: number; catalogue: JobField[] } | null = null;
const TTL_MS = 5 * 60_000;

export async function getJobCatalogue(): Promise<JobField[]> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.catalogue;

    const service = createServiceClient();

    const [{ data: fields, error: fieldError }, { data: titles, error: titleError }] =
        await Promise.all([
            service.from("job_fields").select("value, label, sort_order").order("sort_order"),
            service
                .from("job_titles")
                .select("field_value, title, sort_order")
                .order("field_value")
                .order("sort_order"),
        ]);

    if (fieldError || titleError) {
        logServerError("job-catalogue", fieldError ?? titleError);
        // Serve the last good copy if there is one. An empty dropdown is a
        // broken form, and a stale catalogue is a far smaller problem.
        return cached?.catalogue ?? [];
    }

    const byField = new Map<string, string[]>();
    for (const row of titles ?? []) {
        const key = row.field_value as string;
        if (!byField.has(key)) byField.set(key, []);
        byField.get(key)!.push(row.title as string);
    }

    const catalogue: JobField[] = (fields ?? []).map((f) => ({
        value: f.value as string,
        label: f.label as string,
        titles: byField.get(f.value as string) ?? [],
    }));

    cached = { at: Date.now(), catalogue };
    return catalogue;
}
