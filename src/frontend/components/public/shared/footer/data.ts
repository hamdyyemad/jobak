interface FooterLink {
    name: string;
    href: string;
    badge?: string;
}

/**
 * Columns are either navigation ("links") or plain information ("facts").
 * Facts render as static text, not anchors, so nothing here looks like a link
 * that leads nowhere.
 */
export type FooterColumn =
    | { title: string; kind: "links"; links: FooterLink[] }
    | { title: string; kind: "facts"; items: string[]; note?: string };

/**
 * Only pages that actually exist are linked here. Anything that needs a feature
 * we have not built (blog, careers, status page, public API docs) stays out until
 * it does — see PRE_PRODUCTION.md for what is still outstanding.
 */
export const footerColumns: FooterColumn[] = [
    {
        title: "Product",
        kind: "links",
        links: [
            { name: "Jobs", href: "/jobs" },
            { name: "Talent", href: "/talent" },
            { name: "How it works", href: "/how-it-works" },
            { name: "Features", href: "/features" },
            { name: "Cost", href: "/#cost" },
        ],
    },
    {
        title: "Resources",
        kind: "links",
        links: [
            { name: "FAQ", href: "/faq" },
            { name: "About", href: "/about" },
        ],
    },
];

/** Short, concrete facts about the product — sits under the brand blurb. */
export const brandFacts: string[] = [
    "Every match scored 0–100 by AI",
    "Free — you bring your own Groq key",
    "Open source, MIT licensed",
];

export const socialLinks = [
    { name: "LinkedIn", href: "https://www.linkedin.com/company/jobak_ai" },
];

export interface SupportWallet {
    /** Shown verbatim next to the address — the network must never be ambiguous. */
    network: string;
    address: string;
}

/**
 * Tip wallets shown in the footer's support strip.
 *
 * Intentionally EMPTY: the strip renders nothing while this list is empty, so a
 * placeholder address can never ship. Add real addresses only — a single wrong
 * character sends funds nowhere, and USDT on different chains is not
 * interchangeable, so `network` must exactly match the chain of `address`.
 */
export const supportWallets: SupportWallet[] = [];
