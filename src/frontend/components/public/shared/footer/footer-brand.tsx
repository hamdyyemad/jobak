import { ArrowUpRight, Check } from "lucide-react";
import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { socialLinks, brandFacts } from "./data";

export function FooterBrand() {
  return (
    <div className="col-span-2">
      <div className="mb-6">
        <JobakLogo size="md" showText />
      </div>
      <Description />
      <Facts />
      <SocialLinks />
    </div>
  );
}

function Description() {
  return (
    <p className="text-muted-foreground leading-relaxed mb-6 max-w-xs">
      AI-powered job matching. Tell us what you want — we find it across every major job board.
    </p>
  );
}

function Facts() {
  return (
    <ul className="space-y-2.5 mb-8">
      {brandFacts.map((fact) => (
        <li key={fact} className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
          {fact}
        </li>
      ))}
    </ul>
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
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
    >
      {name}
      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </a>
  );
}
