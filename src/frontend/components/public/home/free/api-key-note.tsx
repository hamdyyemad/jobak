import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { freeContent } from "./data";

export function ApiKeyNote() {
  return (
    <div className="lg:sticky lg:top-32 self-start">
      <p className="text-xl text-background/70 leading-relaxed mb-10">
        {freeContent.description}
      </p>

      <div className="p-5 rounded-xl border border-background/15 bg-background/5 flex gap-4 mb-10">
        <Lock className="w-4 h-4 shrink-0 mt-1" />
        <div>
          <h3 className="font-medium mb-1">Your key stays yours</h3>
          <p className="text-sm text-background/60 leading-relaxed">
            It is encrypted with AES-256-GCM before it is stored and is never shared with
            third parties — we use it only to rank job matches on your behalf. You can grab
            one for free at{" "}
            <a
              href={freeContent.keyLinkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-background"
            >
              {freeContent.keyLinkText}
            </a>
            .
          </p>
        </div>
      </div>

      <Button
        size="lg"
        className="bg-background text-foreground hover:bg-background/90 px-8 h-14 text-base rounded-full group font-medium"
        asChild
      >
        <Link href={freeContent.primaryButton.href}>
          {freeContent.primaryButton.text}
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
    </div>
  );
}
