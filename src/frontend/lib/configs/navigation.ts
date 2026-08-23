/**
 * Root-relative hashes (`/#id`) rather than bare `#id` so the links still resolve
 * from sub-pages like /about, where those sections are not on the current page.
 */
export const landingNavLinks = [
    // Real routes first: these two are the pages we point external traffic at
    // (LinkedIn posts link straight to /jobs), so they should be reachable in
    // one click from anywhere rather than living only in the footer.
    { name: "Jobs", href: "/jobs" },
    { name: "Talent", href: "/talent" },
    { name: "How it works", href: "/#how-it-works" },
    { name: "Features", href: "/#features" },
    { name: "Cost", href: "/#cost" },
];
