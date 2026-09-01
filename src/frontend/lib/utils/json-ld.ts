/**
 * Serialising schema.org data for a `<script type="application/ld+json">`.
 *
 * A plain function in its own file so it can be tested without React —
 * `scripts/json-ld-probe.ts` imports it directly.
 *
 * **`JSON.stringify` does not escape `<`.** Inside a `<script>` element the HTML
 * parser is looking for the literal `</script`, and it finds it wherever it
 * appears, including inside a JSON string. A value containing
 * `</script><img src=x onerror=…>` closes the element early and the remainder is
 * parsed as HTML, in the page's own origin.
 *
 * That was reachable on both public pages before this existed:
 *
 *  - `/jobs` and `/jobs/[slug]` put `title`, `company` and `description` into the
 *    graph. Those come from scraped third-party boards, so anyone able to post a
 *    listing on Wuzzuf, Bayt, Talent.com or a company career site controls them.
 *  - `/talent` puts `display_name`, `headline` and `location` into it — typed by
 *    any signed-up user into the profile form.
 *
 * `>` alone cannot terminate the element and `&` is not parsed inside a script,
 * so `<` is the character that matters. U+2028 and U+2029 are escaped too: they
 * are legal inside a JSON string but are line terminators to a JavaScript
 * parser.
 */
export function serializeJsonLd(data: unknown): string {
    return (
        JSON.stringify(data)
            // The only sequence that can close a <script> element.
            .replaceAll("<", "\\u003c")
            /*
             * Written as escape sequences rather than literal characters: a
             * literal U+2028 in source is itself a line break.
             */
            .replaceAll("\u2028", "\\u2028")
            .replaceAll("\u2029", "\\u2029")
    );
}
