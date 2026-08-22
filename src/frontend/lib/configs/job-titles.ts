/**
 * The shape of the job title catalogue, and the pure helpers that read it.
 *
 * The catalogue itself is no longer here. It lives in the `job_fields` and
 * `job_titles` tables — see `supabase/job-catalogue.sql` — because two things
 * need it and they were reading two different copies: the onboarding dropdown
 * bundled this file, while the hourly collector had to call the app to get at
 * it. One table, both readers, no drift.
 *
 * Fetch it server-side with `getJobCatalogue()` from
 * `@/backend/actions/job-catalogue` and pass it down; these helpers take what
 * you fetched rather than reaching for a module-level array.
 */

export interface JobField {
    /** Stable value persisted to `user_preferences.field`. */
    value: string;
    label: string;
    titles: string[];
}

/** Every title offered for a field, or nothing when the field is unknown. */
export function titlesForField(catalogue: JobField[], field: string): string[] {
    return catalogue.find((f) => f.value === field)?.titles ?? [];
}

/**
 * Display name for a stored field value.
 *
 * Falls back to the raw value so a field retired from the catalogue still reads
 * as something rather than blank on a profile that selected it.
 */
export function fieldLabel(catalogue: JobField[], value: string): string {
    return catalogue.find((f) => f.value === value)?.label ?? value;
}
