import type { CredentialProvider } from "@/frontend/types/on-boarding";

/**
 * Provider marks.
 *
 * Two kinds live here, and the difference matters:
 *
 * - **Apify** is the real symbol, taken from apify.com's own `favicon.svg` /
 *   wordmark. It keeps its brand colours, so it does *not* follow
 *   `currentColor`.
 * - **The four AI providers** are still geometric stand-ins in the spirit of
 *   each brand, not the official artwork. They inherit `currentColor` so each
 *   card can tint them.
 *
 * Replacing the remaining four with official SVGs is the same shape of change
 * as the Apify one — check each brand's usage terms first.
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

/**
 * Apify — the official symbol.
 *
 * Paths lifted verbatim from apify.com's own `wordmark.svg` (the symbol occupies
 * the leading 100x100 of that artboard; the same three shapes are what
 * `favicon.svg` contains on its own). Left in the brand's colours rather than
 * `currentColor`, because the mark *is* three colours — flattening it to one
 * would stop it being the Apify logo.
 */
function ApifyMark({ className }: MarkProps) {
    return (
        <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
            <path
                d="M57.3476 0H98.4848C99.3216 0 100 0.678356 100 1.51515V64.3829C100 65.8888 98.0415 66.4726 97.217 65.2125L56.0797 2.34476C55.4203 1.33706 56.1433 0 57.3476 0Z"
                fill="#246DFF"
            />
            <path
                d="M42.6524 0H1.51515C0.678356 0 0 0.678356 0 1.51515V64.3829C0 65.8888 1.95849 66.4726 2.783 65.2125L43.9203 2.34476C44.5797 1.33706 43.8567 0 42.6524 0Z"
                fill="#20A34E"
            />
            <path
                d="M49.2952 50.3341L2.56323 97.4175C1.61425 98.3736 2.29149 100 3.63861 100H96.3999C97.7415 100 98.4212 98.385 97.4833 97.4257L51.454 50.3423C50.8628 49.7376 49.891 49.7339 49.2952 50.3341Z"
                fill="#F86606"
            />
        </svg>
    );
}

const marks: Record<CredentialProvider, (props: MarkProps) => React.ReactElement> = {
    anthropic: ClaudeMark,
    openai: OpenAiMark,
    gemini: GeminiMark,
    groq: GroqMark,
    apify: ApifyMark,
};

export function AiProviderMark({
    provider,
    className,
}: {
    provider: CredentialProvider;
    className?: string;
}) {
    const Mark = marks[provider];
    return <Mark className={className} />;
}
