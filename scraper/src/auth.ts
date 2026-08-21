import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Shared-secret gate.
 *
 * This service makes outbound requests on demand, so leaving it open would let
 * anyone use it as a free scraping proxy on your Vercel account's bandwidth.
 * The secret is compared in constant time — a plain `===` on a secret leaks its
 * prefix through timing, which is cheap to avoid.
 */
export function isAuthorized(req: VercelRequest): boolean {
    const expected = process.env.SCRAPER_SECRET;
    if (!expected) return false;

    const header = req.headers["x-scraper-secret"];
    const provided = Array.isArray(header) ? header[0] : header;
    if (typeof provided !== "string" || provided.length !== expected.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
    }
    return diff === 0;
}

export function reject(res: VercelResponse) {
    // No detail: a caller without the secret learns nothing about why.
    res.status(401).json({ error: "Unauthorized" });
}
