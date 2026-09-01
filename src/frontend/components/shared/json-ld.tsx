import { serializeJsonLd } from "@/frontend/lib/utils/json-ld";

/**
 * schema.org structured data, serialised safely.
 *
 * A component rather than a bare call, so the safe path is the only path. Three
 * pages were writing `JSON.stringify(data)` straight into a
 * `<script type="application/ld+json">`, which was a stored XSS hole — see
 * `@/frontend/lib/utils/json-ld` for exactly why, and which values made it
 * reachable.
 *
 * `scripts/json-ld-probe.ts` checks both halves: that the escaping holds against
 * real break-out payloads, and that no page has gone back to serialising by
 * hand.
 */
export function JsonLd({ data }: { data: unknown }) {
    return (
        <script
            type="application/ld+json"
            // Safe: `serializeJsonLd` escapes every sequence that can end the
            // element. Never inline `JSON.stringify` here.
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
        />
    );
}
