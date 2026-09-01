"use client";

import { useState } from "react";
import { Check, Copy, FileText, Loader2, Mail, PenLine, Sparkles } from "lucide-react";

export type DocumentKind = "cv_review" | "cv_bullets" | "cover_letter" | "hr_email";

const KINDS: { kind: DocumentKind; label: string; icon: React.ElementType; blurb: string }[] = [
    { kind: "cv_review", label: "Review my CV", icon: Sparkles, blurb: "Fit, gaps and what to change" },
    { kind: "cv_bullets", label: "Tailored bullets", icon: PenLine, blurb: "CV bullets aimed at this role" },
    { kind: "cover_letter", label: "Cover letter", icon: FileText, blurb: "Short, specific, not a template" },
    { kind: "hr_email", label: "Email to HR", icon: Mail, blurb: "With a subject line, ready to send" },
];

interface DocumentGeneratorProps {
    jobDescription: string;
    jobTitle?: string;
    company?: string;
    /** Optional pasted CV, forwarded to every generation. */
    cvText?: string;
    /** Compact enough for the job drawer; roomier on the standalone page. */
    layout?: "drawer" | "page";
}

/**
 * The four generators, sharing one result pane.
 *
 * Results are kept per kind rather than replaced, so switching between a cover
 * letter and the CV review does not throw away work the user already paid their
 * provider for. Each generation costs real money on their key — regenerating
 * because the UI forgot is not an acceptable way to spend it.
 */
export function DocumentGenerator({
    jobDescription,
    jobTitle,
    company,
    cvText,
    layout = "drawer",
}: DocumentGeneratorProps) {
    const [results, setResults] = useState<Partial<Record<DocumentKind, string>>>({});
    const [active, setActive] = useState<DocumentKind | null>(null);
    const [pending, setPending] = useState<DocumentKind | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const enoughText = jobDescription.trim().length >= 80;

    async function generate(kind: DocumentKind) {
        setError(null);
        setActive(kind);

        // Already generated: show it rather than paying for it twice.
        if (results[kind]) return;

        setPending(kind);
        try {
            const response = await fetch("/api/v1/ai/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind, jobDescription, jobTitle, company, cvText }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                setError(payload.error ?? "Couldn't generate that. Please try again.");
                return;
            }

            setResults((previous) => ({ ...previous, [kind]: payload.text }));
        } catch {
            setError("Couldn't reach the server. Check your connection.");
        } finally {
            setPending(null);
        }
    }

    async function copy() {
        const text = active ? results[active] : null;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard is blocked in some embedded contexts; the text is on
            // screen and selectable either way, so this is not worth an error.
        }
    }

    const shown = active ? results[active] : null;

    return (
        <div className={layout === "page" ? "space-y-5" : "space-y-4"}>
            <div className={`grid gap-2 ${layout === "page" ? "sm:grid-cols-2" : "grid-cols-2"}`}>
                {KINDS.map(({ kind, label, icon: Icon, blurb }) => {
                    const isActive = active === kind;
                    const isPending = pending === kind;
                    const done = Boolean(results[kind]);

                    return (
                        <button
                            key={kind}
                            type="button"
                            onClick={() => generate(kind)}
                            disabled={!enoughText || isPending}
                            title={enoughText ? blurb : "Paste a job description first"}
                            className={`flex items-start gap-2.5 rounded-card border p-3 text-left transition-all disabled:opacity-50 ${
                                isActive
                                    ? "border-accent/40 bg-accent/8"
                                    : "border-border-subtle bg-(image:--surface-1) hover:-translate-y-px hover:border-border-strong"
                            }`}
                        >
                            {isPending ? (
                                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-accent" />
                            ) : (
                                <Icon className={`mt-0.5 size-4 shrink-0 ${done ? "text-accent" : "text-fg-tertiary"}`} />
                            )}
                            <span className="min-w-0">
                                <span className="block text-[13px] font-medium text-fg-primary">{label}</span>
                                {layout === "page" && (
                                    <span className="mt-0.5 block text-xs text-fg-quaternary">{blurb}</span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {!enoughText && (
                <p className="text-xs text-(--fg-quaternary)">
                    This listing has no description stored, so there is nothing to work from. Paste the
                    posting into the{" "}
                    <a href="/dashboard/documents" className="text-accent underline underline-offset-2">
                        documents page
                    </a>{" "}
                    instead.
                </p>
            )}

            {error && (
                <p role="alert" className="rounded-control border border-status-rose/30 bg-status-rose/8 px-4 py-2.5 text-sm text-status-rose">
                    {error}
                </p>
            )}

            {shown && (
                <div className="overflow-hidden rounded-card border border-border-subtle bg-(image:--surface-1)">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border-subtle">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.17em] text-fg-quaternary">
                            {KINDS.find((k) => k.kind === active)?.label}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => active && setResults((r) => ({ ...r, [active]: undefined })) }
                                className="text-xs text-(--fg-quaternary) hover:text-(--fg-primary)"
                            >
                                Regenerate
                            </button>
                            <button
                                type="button"
                                onClick={copy}
                                className="inline-flex items-center gap-1.5 text-xs text-(--fg-tertiary) hover:text-(--fg-primary)"
                            >
                                {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </div>

                    {/*
                      `whitespace-pre-wrap` on plain text, not HTML. The prompts
                      ask for plain text with line breaks, so there is nothing to
                      sanitise and nothing to render as markup.
                    */}
                    <pre className="px-4 py-4 text-sm text-(--fg-secondary) leading-relaxed whitespace-pre-wrap font-sans max-h-[28rem] overflow-y-auto">
                        {shown}
                    </pre>
                </div>
            )}

            <p className="text-[11px] text-(--fg-quaternary) leading-relaxed">
                Generated with your own AI key, and billed by your provider at cost. Read it before you
                send it — the model is told never to invent experience, but you are the one applying.
            </p>
        </div>
    );
}
