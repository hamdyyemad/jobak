import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.workPreference || !body.field || !body.skills || body.skills.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Prepare data for n8n webhook
        const webhookData = {
            userId: body.userId || `user_${Date.now()}`, // Generate temporary ID if not provided
            workPreference: body.workPreference,
            location: {
                country: body.location?.country || "",
                city: body.location?.city || "",
            },
            field: body.field,
            skills: body.skills,
            experience: body.experience || 0,
            jobType: body.jobType || [],
            seniority: body.seniority || "mid",
            salary: {
                min: body.salary?.min || 0,
                max: body.salary?.max || 0,
                currency: body.salary?.currency || "USD",
            },
            apiKey: body.apiKey, // This should be encrypted before storage
            timestamp: new Date().toISOString(),
        };

        // TODO: Replace with your actual n8n webhook URL
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || "https://your-n8n-instance.com/webhook/job-search";

        // Trigger n8n workflow
        const response = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookData),
        });

        if (!response.ok) {
            throw new Error(`n8n webhook failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Return success response
        return NextResponse.json({
            success: true,
            message: "Onboarding completed. Job search initiated.",
            data: result,
        });
    } catch (error) {
        console.error("Webhook submission error:", error);
        return NextResponse.json(
            {
                error: "Failed to process onboarding data",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
