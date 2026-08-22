import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized, reject } from "../src/auth.js";
import { registry } from "../src/sources/index.js";

/** Catalogue of what this service can collect, for wiring up a caller. */
export default function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAuthorized(req)) return reject(res);

    res.status(200).json({
        defaults: registry.defaults(),
        sources: registry.describe().map((source) => ({
            key: source.key,
            label: source.label,
            kind: source.kind,
            geo: source.geo,
            countries: source.countries ?? null,
            language: source.language,
            note: source.note ?? null,
            enabledByDefault: source.enabledByDefault,
        })),
    });
}
