"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { SupportWallet } from "../shared/footer/data";

/**
 * Tip addresses, with the network stated as loudly as the address.
 *
 * Shared by the footer strip and `/support` so there is one implementation of
 * the thing that must not be got wrong. Two rules it enforces:
 *
 *  - **The network is never smaller than the address.** USDT exists on TRC-20,
 *    ERC-20, BEP-20 and Solana, and they are not interchangeable. Sending
 *    TRC-20 USDT to an ERC-20 address destroys it. A tip page that shows an
 *    address without shouting the chain is a page that loses people's money.
 *  - **Copy, never retype.** The address is `select-all` and the copy button is
 *    the primary affordance, because a single mistyped character is an
 *    irreversible loss.
 */
export function WalletList({ wallets }: { wallets: SupportWallet[] }) {
    if (wallets.length === 0) return null;

    return (
        <ul className="space-y-3">
            {wallets.map((wallet) => (
                <WalletRow key={`${wallet.network}-${wallet.address}`} wallet={wallet} />
            ))}
        </ul>
    );
}

function WalletRow({ wallet }: { wallet: SupportWallet }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(wallet.address);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard can be blocked by permissions or by an embedded context.
            // The address stays selectable, so this is not worth an error.
            setCopied(false);
        }
    }

    return (
        <li className="rounded-xl border border-border-standard bg-white/2 p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-accent-text">
                    {wallet.network}
                </span>
                <button
                    type="button"
                    onClick={copy}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg px-2 py-1 outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    aria-label={`Copy ${wallet.network} address`}
                >
                    {copied ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-accent" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                        </>
                    )}
                </button>
            </div>

            {/*
              `break-all` rather than `truncate`: an address the reader cannot see
              in full is an address they cannot check against what they pasted,
              and checking the first and last characters is how people avoid
              clipboard-hijacking malware.
            */}
            <code className="block text-xs font-mono text-muted-foreground break-all select-all leading-relaxed">
                {wallet.address}
            </code>

            <span aria-live="polite" className="sr-only">
                {copied ? `${wallet.network} address copied` : ""}
            </span>
        </li>
    );
}
