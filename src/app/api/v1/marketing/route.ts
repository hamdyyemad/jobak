import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { logServerError, toUserMessage, isConnectionError } from "@/backend/lib/errors";
import { cleanMarketingChoice, HEARD_DETAIL_MAX } from "@/frontend/lib/configs/marketing";

/**
 * Stores the onboarding attribution answers.
 *
 * Every field is optional and unknown values are dropped rather than rejected:
 * this runs on a step the user is free to skip, and losing an answer is a much
 * better outcome than showing an error for data that only marketing reads.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));

        const detail =
            typeof body.heardDetail === "string" ? body.heardDetail.trim().slice(0, HEARD_DETAIL_MAX) : "";

        const service = createServiceClient();
        const { error } = await service.from("user_marketing").upsert(
            {
                user_id: user.id,
                heard_from: cleanMarketingChoice("heard_from", body.heardFrom),
                heard_detail: detail || null,
                goal: cleanMarketingChoice("goal", body.goal),
                search_status: cleanMarketingChoice("search_status", body.searchStatus),
                updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        );

        if (error) {
            logServerError("marketing:upsert", error);
            return NextResponse.json(
                { error: toUserMessage(error, "We couldn't save that. You can skip this step.") },
                { status: isConnectionError(error) ? 503 : 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logServerError("marketing", error);
        return NextResponse.json(
            { error: toUserMessage(error, "We couldn't save that. You can skip this step.") },
            { status: isConnectionError(error) ? 503 : 500 }
        );
    }
}
