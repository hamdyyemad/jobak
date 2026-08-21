"use client";

import { useCallback, useState } from "react";
import type { CredentialProvider, KeyCheckStatus } from "@/frontend/types/on-boarding";
import { checkKeyFormat } from "@/frontend/lib/configs/provider-keys";

export interface KeyCheck {
    status: KeyCheckStatus;
    detail?: string;
}

type Checks = Partial<Record<CredentialProvider, KeyCheck>>;

/**
 * Runs each credential past its provider before onboarding finishes.
 *
 * Two stages. The shape is checked here in the browser first — pasting an
 * OpenAI key into the Claude field, or half a key, is answered instantly and
 * never leaves the machine. Only a plausibly-shaped key costs a round trip.
 * The server re-checks the same rules, because this one is a convenience.
 *
 * Every provider is checked on its own request, so several keys are several
 * independent results: one bad key never blocks the others, and a slow provider
 * doesn't hold up a fast one.
 */
export function useKeyVerification() {
    const [checks, setChecks] = useState<Checks>({});

    const set = useCallback((provider: CredentialProvider, check: KeyCheck) => {
        setChecks((prev) => ({ ...prev, [provider]: check }));
    }, []);

    /** Back to unproven — called whenever the key text changes under it. */
    const reset = useCallback((provider: CredentialProvider) => {
        setChecks((prev) => {
            if (!prev[provider] || prev[provider]?.status === "idle") return prev;
            const next = { ...prev };
            delete next[provider];
            return next;
        });
    }, []);

    const verify = useCallback(
        async (provider: CredentialProvider, apiKey: string): Promise<boolean> => {
            // ── Stage 1: local shape check, no network ──────────────
            const format = checkKeyFormat(provider, apiKey);
            if (!format.ok) {
                set(provider, { status: "invalid", detail: format.reason });
                return false;
            }

            // ── Stage 2: ask the provider ───────────────────────────
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
        (provider: CredentialProvider): KeyCheck => checks[provider] ?? { status: "idle" },
        [checks]
    );

    return { checks, statusOf, verify, reset };
}
