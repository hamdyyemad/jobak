"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Check, Loader2, Send } from "lucide-react";
import { submitFeedback } from "@/backend/actions/feedback";
import {
    FEEDBACK_CATEGORIES,
    MESSAGE_MAX,
    MESSAGE_MIN,
} from "@/frontend/lib/configs/feedback";

const INPUT =
    "w-full rounded-xl border border-border-standard bg-white/2 px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:border-accent/50 focus:outline-none transition-colors";

/**
 * The feedback form.
 *
 * Open to anyone, signed in or not, because the people most able to tell us a
 * listing is wrong are the ones who bounced off the product before making an
 * account. Nothing here is required except a category and a sentence — an email
 * field that must be filled is a filter on who bothers to report anything.
 */
export function FeedbackForm() {
    const pathname = usePathname();
    /*
     * When the form appeared, sent with the submission: a form completed in
     * under three seconds was not completed by a person. See `submitFeedback`.
     *
     * Stamped in an effect rather than as `useRef(Date.now())` — reading the
     * clock during render is impure, and React may render a component more than
     * once before committing it.
     */
    const openedAt = useRef<number | null>(null);
    useEffect(() => {
        openedAt.current = Date.now();
    }, []);

    const [category, setCategory] = useState("bug");
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [website, setWebsite] = useState(""); // honeypot
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const tooShort = message.trim().length > 0 && message.trim().length < MESSAGE_MIN;

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        startTransition(async () => {
            const result = await submitFeedback({
                category,
                message,
                email,
                website,
                pagePath: pathname,
                openedAt: openedAt.current ?? undefined,
            });

            if (result.ok) {
                setSent(true);
                setMessage("");
                setEmail("");
            } else {
                setError(result.error ?? "Couldn't send that.");
            }
        });
    }

    if (sent) {
        return (
            <div className="mt-12 max-w-xl rounded-2xl border border-accent/40 bg-accent/6 p-6">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                    <Check className="w-4 h-4 text-accent" />
                    Sent. Thank you.
                </p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {email
                        ? "If it needs a reply, you'll get one at the address you gave."
                        : "You didn't leave an address, so there's no way to reply — but it is read."}
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setSent(false);
                        // Restart the clock, or the second message trips the
                        // speed check that the first one legitimately passed.
                        openedAt.current = Date.now();
                    }}
                    className="mt-4 text-sm text-accent underline underline-offset-2"
                >
                    Send another
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mt-12 max-w-xl space-y-6">
            <fieldset>
                <legend className="text-sm font-medium text-foreground mb-3">What is this about?</legend>
                <div className="space-y-2">
                    {FEEDBACK_CATEGORIES.map((option) => {
                        const selected = category === option.value;
                        return (
                            <label
                                key={option.value}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    selected
                                        ? "border-accent/40 bg-accent/6"
                                        : "border-border-standard bg-white/2 hover:border-foreground/30"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="category"
                                    value={option.value}
                                    checked={selected}
                                    onChange={() => setCategory(option.value)}
                                    className="sr-only"
                                />
                                <span
                                    aria-hidden="true"
                                    className={`mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                                        selected ? "border-accent" : "border-border-strong"
                                    }`}
                                >
                                    {selected && <span className="w-2 h-2 rounded-full bg-accent" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-foreground">{option.label}</span>
                                    {option.hint && (
                                        <span className="block text-xs text-muted-foreground mt-0.5">{option.hint}</span>
                                    )}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
                    What happened?
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                    If it is a listing, paste the link. If it is a bug, what you clicked and what happened
                    instead.
                </p>
                <textarea
                    id="message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={7}
                    maxLength={MESSAGE_MAX}
                    required
                    className={`${INPUT} resize-y`}
                />
                <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                    {message.trim().length} / {MESSAGE_MAX}
                    {tooShort && <span className="text-(--status-amber)"> — need at least {MESSAGE_MIN}</span>}
                </p>
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                    Email <span className="font-normal text-muted-foreground">— only if you want a reply</span>
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={INPUT}
                />
            </div>

            {/*
              Honeypot. Hidden from people and from screen readers, left empty by
              any real submission — and `tabIndex={-1}` keeps it out of keyboard
              navigation so nobody can land in it by accident.
            */}
            <div aria-hidden="true" className="absolute w-px h-px -left-[9999px] overflow-hidden">
                <label htmlFor="website">Website</label>
                <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                />
            </div>

            {error && (
                <p role="alert" className="text-sm text-(--status-rose) border-l-2 border-(--status-rose) pl-3 py-1">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={pending || message.trim().length < MESSAGE_MIN}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-(--bg-canvas) font-semibold text-sm hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
            </button>
        </form>
    );
}
