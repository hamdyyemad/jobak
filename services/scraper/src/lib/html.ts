/**
 * Reading structured data back out of a job page.
 *
 * The old adapters matched job fields with hand-written regexes against raw
 * markup, which is why the Wuzzuf parser stopped returning anything the moment
 * the page became client-rendered. Everything here targets the parts of a page
 * that exist *for* machines — schema.org JSON-LD, Open Graph meta, the sitemap
 * — because those are the parts a redesign does not silently break.
 */

import { clean, stripHtml } from "./normalize.js";

const LD_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Every JSON-LD object on the page, flattened.
 *
 * Publishers nest these three different ways — a bare object, an array, or a
 * `@graph` — and Talent.com uses all three on different page types. Flattening
 * once here means a caller only ever asks "is there a JobPosting".
 */
export function jsonLdObjects(html: string): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = [];

    const visit = (node: unknown): void => {
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (!node || typeof node !== "object") return;

        const obj = node as Record<string, unknown>;
        out.push(obj);

        if (obj["@graph"]) visit(obj["@graph"]);
        if (obj.itemListElement) visit(obj.itemListElement);
        if (obj.item) visit(obj.item);
    };

    for (const match of html.matchAll(LD_BLOCK)) {
        const raw = match[1].trim();
        if (!raw) continue;
        try {
            visit(JSON.parse(raw));
        } catch {
            /*
             * A malformed block is one publisher's bug, not a reason to lose
             * the page — several sites emit a broken breadcrumb alongside a
             * perfectly good JobPosting.
             */
        }
    }

    return out;
}

/** `@type` can be a string or an array; this answers for both. */
export function isType(node: Record<string, unknown>, type: string): boolean {
    const declared = node["@type"];
    if (typeof declared === "string") return declared.toLowerCase() === type.toLowerCase();
    if (Array.isArray(declared)) {
        return declared.some((t) => String(t).toLowerCase() === type.toLowerCase());
    }
    return false;
}

/** The first schema.org object of the given type, or null. */
export function findJsonLd(html: string, type: string): Record<string, unknown> | null {
    return jsonLdObjects(html).find((node) => isType(node, type)) ?? null;
}

/**
 * URLs from an `ItemList`, in list order.
 *
 * Bayt and Talent.com both publish their search results this way: the listing
 * page carries no job detail at all, only an ordered list of the pages that do.
 * That is the discovery half of `DetailPageStrategy`.
 */
export function itemListUrls(html: string, base: string): string[] {
    const urls: string[] = [];

    for (const node of jsonLdObjects(html)) {
        const url = node.url ?? node["@id"];
        if (typeof url !== "string") continue;
        const absolute = absoluteUrl(url, base);
        if (absolute && !urls.includes(absolute)) urls.push(absolute);
    }

    return urls;
}

const META = (attr: string, name: string) =>
    new RegExp(`<meta[^>]*${attr}=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
const META_REVERSED = (attr: string, name: string) =>
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${name}["']`, "i");

/**
 * A meta tag's content, whichever order the attributes happen to be in.
 *
 * Both orders appear in the wild — Wuzzuf emits `content` first on some tags —
 * and a parser that only handles one silently reads an empty title.
 */
export function metaContent(html: string, names: string[]): string {
    for (const name of names) {
        const attr = name.startsWith("og:") || name.startsWith("twitter:") ? "property" : "name";
        for (const pattern of [META(attr, name), META_REVERSED(attr, name), META("name", name), META("property", name)]) {
            const hit = html.match(pattern);
            if (hit?.[1]) return clean(decodeEntities(hit[1]));
        }
    }
    return "";
}

const ENTITY = /&(#x?[0-9a-f]+|[a-z]+);/gi;
const NAMED: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

/** Numeric and named entities → text. `stripHtml` handles the common few; this handles the rest. */
export function decodeEntities(input: string): string {
    return input.replace(ENTITY, (whole, body: string) => {
        if (body.startsWith("#x") || body.startsWith("#X")) {
            return String.fromCodePoint(parseInt(body.slice(2), 16));
        }
        if (body.startsWith("#")) return String.fromCodePoint(parseInt(body.slice(1), 10));
        return NAMED[body.toLowerCase()] ?? whole;
    });
}

/** Resolves a possibly-relative href against a page URL. `""` when it is not a URL at all. */
export function absoluteUrl(href: unknown, base: string): string {
    const raw = clean(href);
    if (!raw || raw.startsWith("#") || /^(javascript|mailto|tel):/i.test(raw)) return "";
    try {
        return new URL(raw, base).toString();
    } catch {
        return "";
    }
}

export interface Anchor {
    href: string;
    text: string;
    /** Byte offset in the source HTML — lets a card parser bound one card by the next. */
    index: number;
}

const ANCHOR = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

/** Every link on the page, resolved and with its text flattened. */
export function anchors(html: string, base: string): Anchor[] {
    const out: Anchor[] = [];
    for (const match of html.matchAll(ANCHOR)) {
        const href = absoluteUrl(match[1], base);
        if (!href) continue;
        out.push({ href, text: stripHtml(match[2]), index: match.index ?? 0 });
    }
    return out;
}

/**
 * The tail of a page, where the social links live.
 *
 * Prefers a real `<footer>`, and falls back to the last fifth of the document —
 * plenty of company sites still close with an unsemantic `<div class="footer">`,
 * and the fallback finds those without a per-site rule.
 */
export function footerHtml(html: string): string {
    const tag = html.match(/<footer\b[\s\S]*?<\/footer>/i);
    if (tag) return tag[0];

    const marked = html.match(/<(div|section)[^>]*(?:id|class)=["'][^"']*footer[^"']*["'][\s\S]*$/i);
    if (marked) return marked[0].slice(0, 40_000);

    return html.slice(Math.floor(html.length * 0.8));
}
