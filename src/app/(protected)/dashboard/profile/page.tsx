import type { Metadata } from "next";
import { createClient } from "@/backend/lib/supabase/server";
import { getMyProfile } from "@/backend/actions/talent";
import { ProfileClient } from "@/frontend/components/protected/profile/profile-client";

export const metadata: Metadata = {
  title: "Public profile — Jobak",
  // Never indexed: it is behind auth, and a signed-out crawler would only see a
  // redirect anyway. Saying so explicitly costs nothing.
  robots: { index: false, follow: false },
};

/**
 * Where someone controls whether they appear in the public talent directory.
 *
 * Dynamic because it reads the signed-in user's own row. Route protection is
 * middleware's job — `/dashboard/*` already requires a session and a finished
 * onboarding — so this page assumes a user rather than re-checking.
 */
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, preferences] = await Promise.all([
    getMyProfile(),
    (async () => {
      if (!user) return { field: null, skills: [], experience: 0, openTo: [] };

      /*
       * Read as the user, not the service role. The preview must show exactly
       * what the public view would show, and the public view reads these same
       * columns — anything the user cannot read here has no business on a card.
       */
      const { data } = await supabase
        .from("user_preferences")
        .select("field, skills, experience, work_preference")
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        field: data?.field ?? null,
        skills: Array.isArray(data?.skills) ? (data.skills as string[]) : [],
        experience: data?.experience ?? 0,
        openTo: Array.isArray(data?.work_preference) ? (data.work_preference as string[]) : [],
      };
    })(),
  ]);

  return <ProfileClient profile={profile} preferences={preferences} />;
}
