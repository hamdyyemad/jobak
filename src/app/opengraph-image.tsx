import { ImageResponse } from "next/og";

/**
 * The link preview.
 *
 * There was no Open Graph image at all before this: `metadata.ts` declared an
 * `openGraph` and a `twitter` block, both with `card: "summary_large_image"`,
 * but never supplied an image for either — so every share of a Jobak link
 * rendered as a bare text card.
 *
 * Generated rather than a checked-in PNG so it stays in step with the brand:
 * the mark below is the same geometry as `JobakLogo`, and the palette is the
 * design system's, not a second copy that drifts the next time either moves.
 */
export const alt = "Jobak — AI-powered job matching";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = "#08090a";
const ACCENT = "#58e68c";
const FG = "#f7f8f8";
const FG_MUTED = "#8a8f98";

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: CANVAS,
                    padding: 72,
                    /* The same lit-surface idea the dashboard cards use. */
                    backgroundImage: `radial-gradient(900px 500px at 78% 8%, rgba(88,230,140,0.13), transparent 70%)`,
                }}
            >
                {/* No gap: the mark IS the J, so "obak" tucks against its stem. */}
                <div style={{ display: "flex", alignItems: "center" }}>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <path
                            d="M42 12 V38 A10 10 0 0 1 22 38"
                            stroke={ACCENT}
                            strokeWidth="7"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <circle cx="25" cy="22" r="5.5" fill={ACCENT} />
                    </svg>
                    <div
                        style={{
                            /* -64 * 0.227, the mark's right bearing less an optical gap. */
                            marginLeft: -14.5,
                            fontSize: 44,
                            fontWeight: 600,
                            letterSpacing: "-0.035em",
                            color: FG,
                        }}
                    >
                        obak
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            fontSize: 74,
                            fontWeight: 600,
                            lineHeight: 1.05,
                            letterSpacing: "-0.04em",
                            color: FG,
                            maxWidth: 940,
                        }}
                    >
                        Jobs worth applying to.
                    </div>
                    <div
                        style={{
                            marginTop: 28,
                            fontSize: 28,
                            lineHeight: 1.4,
                            color: FG_MUTED,
                            maxWidth: 820,
                        }}
                    >
                        Scored against your own profile by AI — running on your provider
                        key, billed at cost.
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        paddingTop: 30,
                        borderTop: "1px solid rgba(255,255,255,0.10)",
                    }}
                >
                    <div style={{ width: 8, height: 8, borderRadius: 8, background: ACCENT }} />
                    <div
                        style={{
                            fontSize: 21,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color: FG_MUTED,
                        }}
                    >
                        jobak.io
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
