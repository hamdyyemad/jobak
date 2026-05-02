import { NextResponse } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { decryptGroqKey } from "@/backend/lib/crypto/groq-key";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: prefs, error } = await service
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !prefs) {
    return NextResponse.json(
      { error: "No preferences found. Complete onboarding first." },
      { status: 404 }
    );
  }

  let groqApiKey = "";
  try {
    groqApiKey = await decryptGroqKey(prefs.groq_api_key_encrypted);
  } catch {
    return NextResponse.json(
      { error: "Failed to decrypt API key" },
      { status: 500 }
    );
  }

  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!n8nUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL not configured" },
      { status: 500 }
    );
  }

  const payload = {
    userId: user.id,
    workPreference: prefs.work_preference,
    location: prefs.location,
    field: prefs.field,
    skills: prefs.skills,
    experience: prefs.experience,
    jobType: prefs.job_types,
    seniority: prefs.seniority,
    salary: prefs.salary,
    groqApiKey,
    timestamp: new Date().toISOString(),
  };

  const n8nResponse = await fetch(n8nUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(n8nSecret ? { "X-Webhook-Secret": n8nSecret } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!n8nResponse.ok) {
    return NextResponse.json(
      { error: "Failed to trigger job search" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
