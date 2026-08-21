import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized, reject } from "../src/auth.js";
import { DEFAULT_SOURCES, sources } from "../src/sources/index.js";

/** Catalogue of what this service can collect, for wiring up a caller. */
export default function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAuthorized(req)) return reject(res);

    res.status(200).json({
        defaults: DEFAULT_SOURCES,
        sources: sources.map((s) => ({
            key: s.key,
            label: s.label,
            kind: s.kind,
            geo: s.geo,
            countries: s.countries ?? null,
            note: s.note ?? null,
            enabledByDefault: DEFAULT_SOURCES.includes(s.key),
        })),
    });
}
