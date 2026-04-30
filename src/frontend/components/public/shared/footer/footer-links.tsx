import { footerSections } from "./data";

export function FooterLinks() {
  return (
    <>
      {footerSections.map((section) => (
        <FooterLinkSection key={section.title} title={section.title} links={section.links} />
      ))}
    </>
  );
}

interface FooterLinkSectionProps {
  title: string;
  links: Array<{
    name: string;
    href: string;
    badge?: string;
  }>;
}

function FooterLinkSection({ title, links }: FooterLinkSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-6">{title}</h3>
      <ul className="space-y-4">
        {links.map((link) => (
          <FooterLinkItem key={link.name} {...link} />
        ))}
      </ul>
    </div>
  );
}

interface FooterLinkItemProps {
  name: string;
  href: string;
  badge?: string;
}

function FooterLinkItem({ name, href, badge }: FooterLinkItemProps) {
  return (
    <li>
      <a
        href={href}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
      >
        {name}
        {badge && (
          <span className="text-xs px-2 py-0.5 bg-foreground text-background rounded-full">
            {badge}
          </span>
        )}
      </a>
    </li>
  );
}
