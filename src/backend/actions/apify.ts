"use server";

/**
 * The Apify marketplace catalogue, fetched from the scraper service.
 *
 * Fetched rather than duplicated. The catalogue is seven actors' worth of
 * pricing notes, coverage and defaults, and it has to stay in step with the
 * input/output mapping that lives beside it in
 * `services/scraper/src/apify/catalogue.ts`. A second copy in this repo would be
 * wrong within a release — the first time an actor changes its pricing model,
 * the settings page would still be quoting the old one.
 *
 * Cached for an hour, because it changes when we ship, not when a user acts.
 */

export interface ApifyActorCard {
  key: string;
  label: string;
  summary: string;
  slug: string;
  url: string;
  /** ISO codes, or null for worldwide. */
  countries: string[] | null;
  language: "en" | "ar";
  pricing: { model: "per-result" | "per-run" | "monthly"; note: string };
  /**
   * Whether the actor publishes a job description.
   *
   * Shown on the card because it is the biggest quality difference between
   * these actors and it is invisible from the name — an actor with no
   * description gives the scorer only a title to judge.
   */
  hasDescription: boolean;
  enabledByDefault: boolean;
}

export interface ApifyCatalogue {
  actors: ApifyActorCard[];
  defaults: string[];
  /** Set when the service could not be reached, so the UI can say so. */
  error?: string;
}

const EMPTY: ApifyCatalogue = { actors: [], defaults: [] };

export async function getApifyCatalogue(): Promise<ApifyCatalogue> {
  const base = process.env.SCRAPER_URL;
  const secret = process.env.SCRAPER_SECRET;

  if (!base || !secret) {
    return { ...EMPTY, error: "Collection service is not configured." };
  }

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/apify`, {
      headers: { "x-scraper-secret": secret },
      // Ships with the release, not with the user — an hour is generous.
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return { ...EMPTY, error: `Collection service responded ${response.status}.` };
    }

    const payload = (await response.json()) as ApifyCatalogue;
    return {
      actors: Array.isArray(payload.actors) ? payload.actors : [],
      defaults: Array.isArray(payload.defaults) ? payload.defaults : [],
    };
  } catch {
    // The marketplace is not worth failing a settings page over: without it the
    // user keeps whatever selection they already had.
    return { ...EMPTY, error: "Couldn't reach the collection service." };
  }
}
