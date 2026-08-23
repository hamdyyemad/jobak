/**
 * Job descriptions, kept readable without becoming an XSS hole.
 *
 * Every description used to go through `stripHtml`, which flattened a posting's
 * bullet lists, headings and paragraphs into one unbroken wall of text. That is
 * what the job drawer has been rendering, and it makes a well-structured
 * posting genuinely harder to read than the original.
 *
 * The obvious fix — store the source's HTML and render it — is how you ship an
 * XSS vulnerability, because this is arbitrary markup from a dozen sites we do
 * not control. So descriptions are reduced here, at collection time, to a small
 * allowlisted subset: the tags that carry meaning for a job ad and nothing
 * else. No attributes survive except `href` on a link, no scripts, no styles,
 * no event handlers, no embedded frames.
 *
 * The app sanitises again before rendering. That is not redundancy for its own
 * sake: rows collected before this existed, and any future writer that is not
 * this service, have made no such promise.
 */

/** Tags worth keeping. A job ad is prose, lists and headings — that is all. */
const ALLOWED = new Set([
    "p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u",
    "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "a",
]);

/** Void elements, which must not be given a closing tag. */
const VOID = new Set(["br"]);

/**
 * Elements whose *content* is removed along with the tag.
 *
 * Dropping only the tag would leave the body of a `<script>` as visible text,
 * which is both ugly and, for `<style>`, a page full of CSS.
 */
const DROP_WITH_CONTENT = /<\s*(script|style|iframe|object|embed|svg|math|template|noscript|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;

/** An unterminated one of the above, plus comments and processing instructions. */
const DANGEROUS_REMNANT = /<\s*\/?\s*(script|style|iframe|object|embed|svg|math|template|noscript|form)\b[^>]*>/gi;
const COMMENT = /<!--[\s\S]*?-->|<![\s\S]*?>|<\?[\s\S]*?\?>/g;

const TAG = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
const HREF = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

/**
 * A URL safe to put in an `href`.
 *
 * Scheme allowlist rather than a `javascript:` denylist — `data:`,
 * `vbscript:` and entity-encoded variants all execute too, and enumerating what
 * is dangerous is a game you lose. Whitespace is stripped first because
 * `java\nscript:` is a real evasion.
 */
function safeHref(raw: string): string | null {
    const value = [...raw]
        .filter((character) => character.charCodeAt(0) > 0x20 && character.charCodeAt(0) !== 0x7f)
        .join("")
        .trim();
    if (!value) return null;

    if (/^(https?:|mailto:)/i.test(value)) return value;
    // Protocol-relative and site-relative links are meaningless once the
    // description has left its original page, so they are dropped rather than
    // resolved against a base that no longer applies.
    return null;
}

function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Source HTML → the allowlisted subset.
 *
 * Disallowed tags lose the tag but keep their text, so a `<div>`-formatted
 * posting still reads correctly instead of losing half its content.
 */
export function sanitizeHtml(input: unknown): string {
    const source = String(input ?? "");
    if (!source) return "";

    const stripped = source
        .replace(DROP_WITH_CONTENT, " ")
        .replace(DANGEROUS_REMNANT, " ")
        .replace(COMMENT, " ");

    /*
     * Text and tags are handled in one pass, rather than rewriting tags and
     * then escaping what is left.
     *
     * That two-step version escaped the sanitiser's own output: it emitted a
     * clean `<p>`, then the blanket "escape every remaining `<`" turned it into
     * `&lt;p>`, and *every* description came out as visible tag soup. Walking
     * the string means an emitted tag is never a candidate for escaping.
     */
    let out = "";
    let cursor = 0;
    /*
     * Tracks anchors we actually opened, so a dropped `<a javascript:…>` does
     * not leave its `</a>` behind as an orphan close tag.
     */
    let openAnchors = 0;

    for (const match of stripped.matchAll(TAG)) {
        const at = match.index ?? 0;
        out += escapeText(stripped.slice(cursor, at));
        cursor = at + match[0].length;

        const closing = Boolean(match[1]);
        const name = match[2].toLowerCase();
        const attributes = match[3] ?? "";

        if (!ALLOWED.has(name)) continue;

        if (closing) {
            if (VOID.has(name)) continue;
            if (name === "a") {
                if (openAnchors === 0) continue;
                openAnchors--;
            }
            out += `</${name}>`;
            continue;
        }

        if (name === "br") {
            out += "<br>";
            continue;
        }

        if (name === "a") {
            const href = safeHref(
                attributes.match(HREF)?.[2] ?? attributes.match(HREF)?.[3] ?? attributes.match(HREF)?.[4] ?? ""
            );
            // A link with nowhere safe to go loses the anchor but keeps its
            // text, so the words are not lost with the URL.
            if (!href) continue;
            openAnchors++;
            out += `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer nofollow">`;
            continue;
        }

        // Every other attribute is dropped: `style`, `class`, `onclick`, and the
        // long tail of `on*` handlers all go together this way.
        out += `<${name}>`;
    }

    out += escapeText(stripped.slice(cursor));
    while (openAnchors-- > 0) out += "</a>";

    return collapse(out);
}

/**
 * Text between tags.
 *
 * Only `<` needs escaping — a bare `>` is harmless as character data, and
 * "salary < 5000 EGP" is a real thing job ads write.
 */
function escapeText(value: string): string {
    return value.replace(/</g, "&lt;");
}

/** Squeezes the whitespace and empty blocks that stripping tags leaves behind. */
function collapse(html: string): string {
    return html
        .replace(/[^\S\n]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .replace(/(<p>\s*<\/p>|<li>\s*<\/li>|<ul>\s*<\/ul>|<ol>\s*<\/ol>)/gi, "")
        .replace(/(<br>\s*){3,}/gi, "<br><br>")
        .trim();
}

/**
 * Plain text → the same subset, with its structure recovered.
 *
 * Several sources send plain text where the layout is carried by newlines and
 * `-`/`•` bullets — and every row already in `jobs` is flattened text. Rendering
 * those as one paragraph would keep the exact problem this module exists to fix,
 * so the shape is reconstructed rather than assumed absent.
 */
export function textToHtml(input: unknown): string {
    const text = String(input ?? "").trim();
    if (!text) return "";

    const escape = (value: string) =>
        value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const blocks = text.split(/\n\s*\n+/).filter((block) => block.trim());
    const out: string[] = [];

    for (const block of blocks) {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const bulleted = lines.filter((line) => /^([-*•·▪]|\d+[.)])\s+/.test(line));

        // A block is a list when most of it is bullets — one stray dash in a
        // paragraph should not turn the paragraph into a list.
        if (lines.length > 1 && bulleted.length >= Math.ceil(lines.length * 0.6)) {
            const items = lines
                .map((line) => line.replace(/^([-*•·▪]|\d+[.)])\s+/, ""))
                .map((line) => `<li>${escape(line)}</li>`)
                .join("");
            out.push(`<ul>${items}</ul>`);
        } else {
            out.push(`<p>${escape(lines.join(" "))}</p>`);
        }
    }

    return out.join("");
}

/**
 * True when the value carries markup rather than being plain text.
 *
 * Built from `ALLOWED` plus the structural tags a source might use, rather than
 * hand-listed. The hand-listed version omitted `a`, which meant a description
 * whose only markup was links skipped the sanitiser entirely and came out as
 * escaped tag soup — with `javascript:` hrefs visible as text.
 *
 * Anchored to a real tag shape so "salary < 5000" and "C<T>" stay plain text.
 */
const MARKUP = new RegExp(
    `<\\s*/?\\s*(?:${[...ALLOWED, "div", "span", "table", "tr", "td", "section", "article", "img"].join("|")})\\b[^>]*>`,
    "i"
);

export function looksLikeHtml(input: unknown): boolean {
    return MARKUP.test(String(input ?? ""));
}

/**
 * The one entry point sources use: whatever the source sent → safe, structured HTML.
 */
export function toSafeDescription(input: unknown): string {
    const raw = String(input ?? "").trim();
    if (!raw) return "";
    return looksLikeHtml(raw) ? sanitizeHtml(raw) : textToHtml(raw);
}

/**
 * Truncates without severing a tag.
 *
 * Cutting HTML at a byte count can land inside `<a href="…` and produce markup
 * that swallows the rest of the page. Trimming back to the last complete tag and
 * closing what is still open is the difference between a shortened description
 * and a broken one.
 */
export function truncateHtml(html: string, max: number): string {
    if (html.length <= max) return html;

    let cut = html.slice(0, max);

    // Never end mid-tag.
    const lastOpen = cut.lastIndexOf("<");
    const lastClose = cut.lastIndexOf(">");
    if (lastOpen > lastClose) cut = cut.slice(0, lastOpen);

    // Close whatever is still open, innermost first.
    const open: string[] = [];
    for (const match of cut.matchAll(/<(\/?)([a-z0-9]+)[^>]*>/gi)) {
        const name = match[2].toLowerCase();
        if (VOID.has(name)) continue;
        if (match[1]) {
            const at = open.lastIndexOf(name);
            if (at !== -1) open.splice(at, 1);
        } else {
            open.push(name);
        }
    }

    return cut.trimEnd() + open.reverse().map((name) => `</${name}>`).join("") + "…";
}
