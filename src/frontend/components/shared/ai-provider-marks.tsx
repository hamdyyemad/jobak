import type { AiProvider } from "@/frontend/types/on-boarding";

/**
 * Simplified marks for the four AI providers, drawn in-repo.
 *
 * These are geometric stand-ins in the shape of each brand's mark — not the
 * official trademarked artwork, which we do not ship. They inherit
 * `currentColor`, so each card tints its own mark. Swap in official SVGs here if
 * the brands' usage terms are reviewed and cleared.
 */

interface MarkProps {
    className?: string;
}

/** Anthropic / Claude — radial burst. */
function ClaudeMark({ className }: MarkProps) {
    // Ten spokes on a circle, tapering outward from the centre.
    const spokes = Array.from({ length: 10 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 10 - Math.PI / 2;
        return {
            x1: 12 + Math.cos(angle) * 2.4,
            y1: 12 + Math.sin(angle) * 2.4,
            x2: 12 + Math.cos(angle) * 9.5,
            y2: 12 + Math.sin(angle) * 9.5,
        };
    });

    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            {spokes.map((s, i) => (
                <line
                    key={i}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="currentColor"
                    strokeWidth={2.1}
                    strokeLinecap="round"
                />
            ))}
        </svg>
    );
}

/** OpenAI / ChatGPT — interlocking hexagonal knot. */
function OpenAiMark({ className }: MarkProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path
                d="M12 3.2 4.9 7.3v8.2L12 19.6l7.1-4.1V7.3L12 3.2Z"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinejoin="round"
            />
            <path
                d="M12 3.2v8.2l7.1 4.1M12 11.4 4.9 15.5M12 11.4v8.2"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}

/** Google Gemini — four-pointed sparkle. */
function GeminiMark({ className }: MarkProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path
                d="M12 2c0 5.523 4.477 10 10 10-5.523 0-10 4.477-10 10 0-5.523-4.477-10-10-10 5.523 0 10-4.477 10-10Z"
                fill="currentColor"
            />
        </svg>
    );
}

/** Groq — rounded tile with the cut circle of its glyph. */
function GroqMark({ className }: MarkProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="11" r="6.4" stroke="currentColor" strokeWidth={2.2} />
            <path d="M12 11h6.6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
            <path d="M15.6 15.4 19 20" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
        </svg>
    );
}

const marks: Record<AiProvider, (props: MarkProps) => React.ReactElement> = {
    anthropic: ClaudeMark,
    openai: OpenAiMark,
    gemini: GeminiMark,
    groq: GroqMark,
};

export function AiProviderMark({ provider, className }: { provider: AiProvider; className?: string }) {
    const Mark = marks[provider];
    return <Mark className={className} />;
}
