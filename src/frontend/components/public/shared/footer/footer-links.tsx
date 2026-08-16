import Link from "next/link";
import { footerColumns, FooterColumn } from "./data";

export function FooterLinks() {
  return (
    <>
      {footerColumns.map((column) => (
        <FooterColumnBlock key={column.title} column={column} />
      ))}
    </>
  );
}

function FooterColumnBlock({ column }: { column: FooterColumn }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-6">{column.title}</h3>
      {column.kind === "links" ? (
        <ul className="space-y-4">
          {column.links.map((link) => (
            <FooterLinkItem key={link.name} {...link} />
          ))}
        </ul>
      ) : (
        <FactList items={column.items} note={column.note} />
      )}
    </div>
  );
}

/** Static information, deliberately not anchors — there is nowhere to click through to. */
function FactList({ items, note }: { items: string[]; note?: string }) {
  return (
    <>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
      {note && (
        <p className="text-xs text-muted-foreground/70 mt-5 leading-relaxed">{note}</p>
      )}
    </>
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
      <Link
        href={href}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
      >
        {name}
        {badge && (
          <span className="text-xs px-2 py-0.5 bg-foreground text-background rounded-full">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}
