/**
 * Job descriptions → HTML that is safe to render.
 *
 * The scraper service already sanitises to this exact subset before writing
 * (`services/scraper/src/lib/sanitize.ts`), and this is deliberately a second
 * pass rather than trusting that. Three reasons it is not redundant:
 *
 *  - every row collected before that existed is flattened plain text, and
 *    rendering it raw would keep the wall-of-text problem;
 *  - the Apify collectors and the n8n workflows also write `jobs.description`,
 *    and they make no such promise;
 *  - the output goes through `dangerouslySetInnerHTML`, and a component that
 *    renders unsanitised third-party markup is one bad upstream change away
 *    from stored XSS.
 *
 * Kept dependency-free and duplicated rather than shared: the scraper is a
 * separate deployable, installed with `--ignore-workspace`, so a shared package
 * would couple two things that deploy independently. If you change the tag
 * allowlist here, change it there too.
 */

/** Tags worth keeping. A job ad is prose, lists and headings — that is all. */
const ALLOWED = new Set([
  "p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u",
  "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "a",
]);

const VOID = new Set(["br"]);

/** Elements whose content goes with the tag, so a `<style>` body is not shown as text. */
const DROP_WITH_CONTENT =
  /<\s*(script|style|iframe|object|embed|svg|math|template|noscript|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_REMNANT =
  /<\s*\/?\s*(script|style|iframe|object|embed|svg|math|template|noscript|form)\b[^>]*>/gi;
const COMMENT = /<!--[\s\S]*?-->|<![\s\S]*?>|<\?[\s\S]*?\?>/g;

const TAG = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
const HREF = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

const MARKUP = new RegExp(
  `<\\s*/?\\s*(?:${[...ALLOWED, "div", "span", "table", "tr", "td", "section", "article", "img"].join("|")})\\b[^>]*>`,
  "i"
);

/**
 * A URL safe to put in an `href`.
 *
 * Scheme allowlist, not a `javascript:` denylist — `data:` and `vbscript:`
 * execute too. Whitespace and control characters are stripped first, because
 * `java\nscript:` is a real evasion.
 */
function safeHref(raw: string): string | null {
  const value = [...raw]
    .filter((character) => character.charCodeAt(0) > 0x20 && character.charCodeAt(0) !== 0x7f)
    .join("")
    .trim();

  if (!value) return null;
  return /^(https?:|mailto:)/i.test(value) ? value : null;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Only `<` needs escaping in text — a bare `>` is harmless character data. */
function escapeText(value: string): string {
  return value.replace(/</g, "&lt;");
}

function sanitizeHtml(input: string): string {
  const stripped = input
    .replace(DROP_WITH_CONTENT, " ")
    .replace(DANGEROUS_REMNANT, " ")
    .replace(COMMENT, " ");

  /*
   * Text and tags in one pass. Rewriting tags and *then* escaping leftover `<`
   * escapes the sanitiser's own output, so every description renders as visible
   * tag soup — which is exactly the bug this was written to fix.
   */
  let out = "";
  let cursor = 0;
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
      const found = attributes.match(HREF);
      const href = safeHref(found?.[2] ?? found?.[3] ?? found?.[4] ?? "");
      // Drop the anchor, keep its words.
      if (!href) continue;
      openAnchors++;
      out += `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer nofollow">`;
      continue;
    }

    out += `<${name}>`;
  }

  out += escapeText(stripped.slice(cursor));
  while (openAnchors-- > 0) out += "</a>";

  return collapse(out);
}

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
 * Every job already in the pool is flattened text whose layout survives only as
 * newlines and `-`/`•` bullets. Wrapping that in one `<p>` would leave the
 * dashboard exactly as unreadable as before, so the shape is rebuilt.
 */
function textToHtml(text: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const blocks = text.split(/\n\s*\n+/).filter((block) => block.trim());
  const out: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const bulleted = lines.filter((line) => /^([-*•·▪]|\d+[.)])\s+/.test(line));

    // Most of the block has to be bullets — one stray dash in a paragraph
    // should not turn the paragraph into a list.
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

/** Whatever is in `jobs.description` → HTML that is safe to render. */
export function sanitizeDescription(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  return MARKUP.test(raw) ? sanitizeHtml(raw) : textToHtml(raw);
}
