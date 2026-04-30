import { FooterBrand } from "./footer-brand";
import { FooterLinks } from "./footer-links";
import { FooterBottom } from "./footer-bottom";

export function FooterSection() {
  return (
    <footer className="relative border-t border-foreground/10">      
      <div className="relative z-10 max-w-350 mx-auto px-6 lg:px-12">
        <div className="py-16 lg:py-24">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8">
            <FooterBrand />
            <FooterLinks />
          </div>
        </div>

        <FooterBottom />
      </div>
    </footer>
  );
}