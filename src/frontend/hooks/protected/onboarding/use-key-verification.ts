"use client";

import { useCallback, useState } from "react";
import type { AiProvider, KeyCheckStatus } from "@/frontend/types/on-boarding";

export interface KeyCheck {
    status: KeyCheckStatus;
    detail?: string;
}

type Checks = Partial<Record<AiProvider, KeyCheck>>;

/**
 * Runs each provider's key past that provider before onboarding finishes.
 *
 * Every provider is checked on its own request, so four keys are four
 * independent results — one bad key never blocks the others, and a slow provider
 * doesn't hold up a fast one.
 */
export function useKeyVerification() {
    const [checks, setChecks] = useState<Checks>({});

    const set = useCallback((provider: AiProvider, check: KeyCheck) => {
        setChecks((prev) => ({ ...prev, [provider]: check }));
    }, []);

    /** Back to unproven — called whenever the key text changes under it. */
    const reset = useCallback((provider: AiProvider) => {
        setChecks((prev) => {
            if (!prev[provider] || prev[provider]?.status === "idle") return prev;
            const next = { ...prev };
            delete next[provider];
            return next;
        });
    }, []);

    const verify = useCallback(
        async (provider: AiProvider, apiKey: string): Promise<boolean> => {
            set(provider, { status: "checking" });

            try {
                const response = await fetch("/api/v1/ai/verify-key", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider, apiKey }),
                });

                const result = await response.json();

                if (!response.ok) {
                    set(provider, { status: "invalid", detail: result.error ?? "Check failed." });
                    return false;
                }

                set(provider, {
                    status: result.valid ? "valid" : "invalid",
                    detail: result.detail,
                });
                return Boolean(result.valid);
            } catch {
                set(provider, { status: "invalid", detail: "Couldn't run the check. Check your connection." });
                return false;
            }
        },
        [set]
    );

    const statusOf = useCallback(
        (provider: AiProvider): KeyCheck => checks[provider] ?? { status: "idle" },
        [checks]
    );

    /** At least one provider proved out — the gate on finishing onboarding. */
    const hasVerified = Object.values(checks).some((c) => c.status === "valid");

    return { checks, statusOf, verify, reset, hasVerified };
}
