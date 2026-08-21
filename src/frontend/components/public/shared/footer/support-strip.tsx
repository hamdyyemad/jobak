"use client";
import { useState } from "react";
import { Check, Copy, Coffee } from "lucide-react";
import { supportWallets, SupportWallet } from "./data";

/**
 * "Buy me a coffee" tip strip.
 *
 * Renders nothing at all when no wallets are configured, so the site never shows
 * a placeholder or half-filled address.
 */
export function SupportStrip() {
  if (supportWallets.length === 0) return null;

  return (
    <div className="py-8 border-t border-foreground/10">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="max-w-sm">
          <h3 className="text-sm font-medium mb-2 inline-flex items-center gap-2">
            <Coffee className="w-4 h-4 text-accent" />
            Buy me a coffee
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Jobak is free and always will be. If it helped you land something, a tip
            keeps it running.
          </p>
        </div>

        <ul className="space-y-2 w-full lg:max-w-xl">
          {supportWallets.map((wallet) => (
            <WalletRow key={`${wallet.network}-${wallet.address}`} wallet={wallet} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function WalletRow({ wallet }: { wallet: SupportWallet }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions; the address stays selectable.
      setCopied(false);
    }
  };

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border-standard bg-white/2 px-4 py-3">
      <span className="text-xs font-mono text-accent-text shrink-0 w-24">
        {wallet.network}
      </span>
      <code className="text-xs font-mono text-muted-foreground truncate flex-1 select-all">
        {wallet.address}
      </code>
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
      <span aria-live="polite" className="sr-only">
        {copied ? `${wallet.network} address copied` : ""}
      </span>
    </li>
  );
}
