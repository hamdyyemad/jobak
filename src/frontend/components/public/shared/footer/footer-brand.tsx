import { ArrowUpRight } from "lucide-react";
import { socialLinks } from "./data";

export function FooterBrand() {
  return (
    <div className="col-span-2">
      <Logo />
      <Description />
      <SocialLinks />
    </div>
  );
}

function Logo() {
  return (
    <a href="#" className="inline-flex items-center gap-2 mb-6">
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-(--bg-canvas) text-base">
        J
      </div>
      <span className="text-2xl font-display">Jobak</span>
    </a>
  );
}

function Description() {
  return (
    <p className="text-muted-foreground leading-relaxed mb-8 max-w-xs">
      AI-powered job matching. Tell us what you want — we find it across every major job board.
    </p>
  );
}

function SocialLinks() {
  return (
    <div className="flex gap-6">
      {socialLinks.map((link) => (
        <SocialLink key={link.name} name={link.name} href={link.href} />
      ))}
    </div>
  );
}

interface SocialLinkProps {
  name: string;
  href: string;
}

function SocialLink({ name, href }: SocialLinkProps) {
  return (
    <a
      href={href}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
    >
      {name}
      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </a>
  );
}
