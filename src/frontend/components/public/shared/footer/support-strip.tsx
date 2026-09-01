import Link from "next/link";
import { Coffee } from "lucide-react";
import { supportWallets } from "./data";
import { WalletList } from "@/frontend/components/public/support/wallet-list";

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

        <div className="w-full lg:max-w-xl">
          <WalletList wallets={supportWallets} />
          <Link
            href="/support"
            className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Other ways to help
          </Link>
        </div>
      </div>
    </div>
  );
}
