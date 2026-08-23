"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createClient } from "@/backend/lib/supabase/server";
import { logServerError } from "@/backend/lib/errors";

/**
 * The opt-in talent directory.
 *
 * Two halves that must not be confused:
 *
 *  - `getPublicTalent` reads the `public_talent` **view**, which only ever
 *    contains rows whose owner switched them on. It is the single public read
 *    surface; the base table is not granted to anon at all.
 *  - Everything else is owner-scoped and runs as the signed-in user, so RLS
 *    proves ownership rather than this code asserting it. Nothing here uses the
 *    service role — a bug in this file must not be able to publish someone.
 */

export interface TalentCard {
  slug: string;
  displayName: string | null;
  headline: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  location: string | null;
  field: string | null;
  skills: string[] | null;
  experienceYears: number | null;
  seniority: string | null;
  openTo: string[] | null;
}

export interface MyProfile {
  displayName: string;
  headline: string;
  bio: string;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl: string;
  locationLabel: string;
  isPublic: boolean;
  publishedAt: string | null;
  slug: string | null;
  showField: boolean;
  showSkills: boolean;
  showExperience: boolean;
  showOpenTo: boolean;
}

const EMPTY: MyProfile = {
  displayName: "",
  headline: "",
  bio: "",
  linkedinUrl: "",
  githubUrl: "",
  websiteUrl: "",
  locationLabel: "",
  isPublic: false,
  publishedAt: null,
  slug: null,
  showField: true,
  showSkills: true,
  showExperience: false,
  showOpenTo: true,
};

export const getPublicTalent = cache(async (limit = 120): Promise<TalentCard[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_talent")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      logServerError("talent:list", error);
      return [];
    }

    return (data ?? []).map((row) => ({
      slug: row.slug as string,
      displayName: row.display_name ?? null,
      headline: row.headline ?? null,
      bio: row.bio ?? null,
      linkedinUrl: row.linkedin_url ?? null,
      githubUrl: row.github_url ?? null,
      websiteUrl: row.website_url ?? null,
      location: row.location_label ?? null,
      field: row.field ?? null,
      skills: Array.isArray(row.skills) ? row.skills : null,
      experienceYears: row.experience_years ?? null,
      seniority: row.seniority ?? null,
      openTo: Array.isArray(row.open_to) ? row.open_to : null,
    }));
  } catch (error) {
    logServerError("talent:list", error);
    return [];
  }
});

export async function getMyProfile(): Promise<MyProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "display_name, headline, bio, linkedin_url, github_url, website_url, location_label, is_public, published_at, slug, show_field, show_skills, show_experience, show_open_to"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logServerError("talent:mine", error);
    return EMPTY;
  }
  if (!data) {
    // No row yet. Seed the name from their auth identity as a starting value —
    // it is prefilled into a form they still have to submit, not published.
    return {
      ...EMPTY,
      displayName: (user.user_metadata?.full_name as string | undefined) ?? "",
    };
  }

  return {
    displayName: data.display_name ?? "",
    headline: data.headline ?? "",
    bio: data.bio ?? "",
    linkedinUrl: data.linkedin_url ?? "",
    githubUrl: data.github_url ?? "",
    websiteUrl: data.website_url ?? "",
    locationLabel: data.location_label ?? "",
    isPublic: Boolean(data.is_public),
    publishedAt: data.published_at ?? null,
    slug: data.slug ?? null,
    showField: Boolean(data.show_field),
    showSkills: Boolean(data.show_skills),
    showExperience: Boolean(data.show_experience),
    showOpenTo: Boolean(data.show_open_to),
  };
}

export interface SaveProfileInput {
  displayName: string;
  headline: string;
  bio: string;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl: string;
  locationLabel: string;
  showField: boolean;
  showSkills: boolean;
  showExperience: boolean;
  showOpenTo: boolean;
}

/**
 * Only `https://` links, and only to the hosts each field is for.
 *
 * These end up as anchors on a public page. Without a scheme check a saved
 * `javascript:` URL would be stored and rendered, and without a host check the
 * "LinkedIn" link on someone's card could point anywhere at all.
 */
function cleanUrl(value: string, host: RegExp | null): string {
  const raw = value.trim();
  if (!raw) return "";

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (host && !host.test(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export async function saveProfile(input: SaveProfileInput): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const linkedin = cleanUrl(input.linkedinUrl, /(^|\.)linkedin\.com$/i);
  if (input.linkedinUrl.trim() && !linkedin) {
    return { ok: false, error: "That LinkedIn link doesn't look like a linkedin.com URL." };
  }

  const github = cleanUrl(input.githubUrl, /(^|\.)github\.com$/i);
  if (input.githubUrl.trim() && !github) {
    return { ok: false, error: "That GitHub link doesn't look like a github.com URL." };
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      display_name: input.displayName.trim().slice(0, 80) || null,
      headline: input.headline.trim().slice(0, 140) || null,
      bio: input.bio.trim().slice(0, 600) || null,
      linkedin_url: linkedin || null,
      github_url: github || null,
      website_url: cleanUrl(input.websiteUrl, null) || null,
      location_label: input.locationLabel.trim().slice(0, 80) || null,
      show_field: input.showField,
      show_skills: input.showSkills,
      show_experience: input.showExperience,
      show_open_to: input.showOpenTo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    logServerError("talent:save", error);
    return { ok: false, error: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/talent");
  return { ok: true };
}

/**
 * Publish or unpublish.
 *
 * Goes through the `set_profile_visibility` RPC rather than an UPDATE, so
 * consent timestamping and slug allocation happen together and cannot be done
 * halfway. The function runs `SECURITY INVOKER`, so RLS still checks ownership.
 */
export async function setProfileVisibility(isPublic: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (isPublic) {
    // A card with no name and no LinkedIn is an empty card — the view filters
    // it out anyway, so refuse here where we can explain why.
    const profile = await getMyProfile();
    if (!profile.displayName.trim() && !profile.linkedinUrl.trim()) {
      return { ok: false, error: "Add a display name or a LinkedIn link before publishing." };
    }
  }

  const { error } = await supabase.rpc("set_profile_visibility", { p_is_public: isPublic });

  if (error) {
    logServerError("talent:visibility", error);
    return { ok: false, error: "Couldn't change your visibility. Please try again." };
  }

  revalidatePath("/talent");
  return { ok: true };
}
