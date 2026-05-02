import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { encryptGroqKey } from "@/backend/lib/crypto/groq-key";

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate the user ──────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse + validate body ──────────────────────────────
    const body = await request.json();

    if (!body.workPreference || !body.field) {
      return NextResponse.json(
        { error: "Missing required fields: workPreference, field" },
        { status: 400 }
      );
    }

    if (!body.apiKey || typeof body.apiKey !== "string") {
      return NextResponse.json(
        { error: "Groq API key is required" },
        { status: 400 }
      );
    }

    // ── 3. Encrypt Groq API key + persist preferences ─────────
    const encryptedKey = await encryptGroqKey(body.apiKey as string);

    const service = createServiceClient();
    const { error: upsertError } = await service
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          work_preference: body.workPreference,
          location: body.location ?? { country: "", city: "" },
          field: body.field,
          skills: body.skills,
          experience: body.experience ?? 0,
          job_types: body.jobType ?? [],
          seniority: body.seniority ?? "mid",
          salary: body.salary ?? { min: 0, max: 0, currency: "USD" },
          groq_api_key_encrypted: encryptedKey,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Failed to save preferences:", upsertError);
      return NextResponse.json(
        { error: "Failed to save preferences" },
        { status: 500 }
      );
    }

    // ── 4. Forward to n8n with webhook secret ─────────────────
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
      workPreference: body.workPreference,
      location: body.location ?? { country: "", city: "" },
      field: body.field,
      skills: body.skills,
      experience: body.experience ?? 0,
      jobType: body.jobType ?? [],
      seniority: body.seniority ?? "mid",
      salary: body.salary ?? { min: 0, max: 0, currency: "USD" },
      // Pass the plaintext key to n8n so it can call Groq — n8n is server-side only
      groqApiKey: body.apiKey,
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
      const text = await n8nResponse.text().catch(() => "");
      console.error("n8n webhook error:", n8nResponse.status, text);
      // Return success to user anyway — preferences are saved; n8n can be retried
      return NextResponse.json({
        success: true,
        message: "Preferences saved. Job search will run shortly.",
        n8nWarning: "Workflow trigger failed — it will be retried.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding complete. Job search started.",
    });
  } catch (error) {
    console.error("Webhook route error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
