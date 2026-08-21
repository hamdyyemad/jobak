"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { toUserMessage, logServerError } from "@/backend/lib/errors";

async function getOnboardingDestination(userId: string): Promise<"/onboarding" | "/dashboard"> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single();

    return data?.onboarding_completed ? "/dashboard" : "/onboarding";
  } catch (error) {
    // Sign-in already succeeded — send them to onboarding rather than fail the login
    logServerError("getOnboardingDestination", error);
    return "/onboarding";
  }
}

const SIGN_UP_FALLBACK = "We couldn't create your account. Please try again.";

export async function signUp(formData: FormData) {
  let destination: string;

  // NOTE: redirect() throws NEXT_REDIRECT by design, so it must stay outside the
  // try/catch or it would be swallowed and reported as a failure.
  try {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = (formData.get("fullName") as string) || "";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      logServerError("signUp", error);
      return { error: toUserMessage(error, SIGN_UP_FALLBACK) };
    }

    /*
     * With email confirmation switched on, signUp succeeds but returns no
     * session. Sending them to /onboarding then just bounces off the middleware
     * into /login with no explanation, which is what made this look broken.
     *
     * Note we do not branch on whether the address was already registered.
     * Supabase deliberately returns an indistinguishable response there, and
     * saying "that email exists" would turn signup into an account oracle.
     */
    destination = data.session
      ? "/onboarding"
      : `/login?notice=verify-email&email=${encodeURIComponent(email)}`;
  } catch (error) {
    logServerError("signUp", error);
    return { error: toUserMessage(error, SIGN_UP_FALLBACK) };
  }

  redirect(destination);
}

const SIGN_IN_FALLBACK = "We couldn't sign you in. Please try again.";

export async function signIn(formData: FormData) {
  let destination: "/onboarding" | "/dashboard";

  try {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logServerError("signIn", error);
      return { error: toUserMessage(error, SIGN_IN_FALLBACK) };
    }

    destination = await getOnboardingDestination(data.user.id);
  } catch (error) {
    logServerError("signIn", error);
    return { error: toUserMessage(error, SIGN_IN_FALLBACK) };
  }

  // Outside the try/catch — redirect() signals by throwing
  redirect(destination);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
