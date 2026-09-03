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
 * it does — see docs/general/PRE_PRODUCTION.md for what is still outstanding.
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
            { name: "Feedback", href: "/feedback" },
            { name: "Support", href: "/support" },
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
    /**
     * Shown verbatim next to the address, and it must name the **chain**, not
     * just the coin.
     *
     * "USDT" is not a network. USDT exists on TRC-20, ERC-20, BEP-20 and Solana,
     * and sending to the wrong one destroys the funds irreversibly. Write
     * "USDT (TRC-20)", never "USDT".
     */
    network: string;
    address: string;
}

/**
 * Tip wallets, shown in the footer strip and on `/support`.
 *
 * **Intentionally EMPTY, and it must stay that way until real addresses exist.**
 * Both surfaces render nothing while the list is empty, so a placeholder can
 * never ship — and a placeholder tip address is not a cosmetic bug, it is money
 * sent to a stranger or to nowhere, discovered only when someone tries it.
 *
 * To add BTC and USDT:
 *
 * ```ts
 * export const supportWallets: SupportWallet[] = [
 *     { network: "Bitcoin",        address: "PASTE_YOUR_BTC_ADDRESS" },
 *     { network: "USDT (TRC-20)",  address: "PASTE_YOUR_TRON_ADDRESS" },
 *     { network: "USDT (ERC-20)",  address: "PASTE_YOUR_ETHEREUM_ADDRESS" },
 * ];
 * ```
 *
 * The markers are deliberately not valid addresses: uncommenting this without
 * filling it in produces something obviously broken rather than something that
 * silently accepts a transfer.
 *
 * Before shipping any address:
 *
 *  1. **Copy it out of the wallet app.** Never retype, never transcribe from a
 *     screenshot — one wrong character is an irrecoverable loss.
 *  2. **Check `network` matches the chain the address belongs to.** A TRON
 *     address starts `T`; an Ethereum/BSC address starts `0x`; they are not
 *     interchangeable even though both can hold "USDT".
 *  3. **Send a test transfer of the smallest amount you can** from a different
 *     wallet, and confirm it arrives, before the address is public.
 *  4. **Use a receive-only address** you are happy to have indexed forever. This
 *     goes on a public page; it will be scraped and it cannot be recalled.
 */
export const supportWallets: SupportWallet[] = [];
