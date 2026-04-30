"use client";
import { useState } from "react";
import { useBodyScrollLock } from "@/frontend/hooks";

import { Button } from "@/frontend/components/ui/button";
import { Menu, X } from "lucide-react";
import { NavLogo } from "./nav-logo";

import { landingNavLinks as navLinks } from "@/frontend/lib";

export function MobileNavigation({ isScrolled }: { isScrolled: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent scrolling when menu is open
  useBodyScrollLock(isOpen);

  return (
    <>
      <header className={`fixed z-50 transition-all duration-500 ${isScrolled ? "top-4 left-4 right-4" : "top-0 left-0 right-0"}`}>
        <nav className={`mx-auto transition-all duration-500 ${isScrolled || isOpen ? "bg-background/80 backdrop-blur-xl rounded-2xl shadow-lg" : "bg-transparent"}`}>
          <div className={`flex items-center justify-between px-6 transition-all duration-500 ${isScrolled ? "h-14" : "h-20"}`}>
            <NavLogo isScrolled={isScrolled} />
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-foreground">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </nav>
      </header>

      <div className={`fixed inset-0 bg-background z-40 transition-transform duration-500 ${isOpen ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="flex flex-col h-full px-8 pt-32 pb-10">
          <div className="flex-1 flex flex-col gap-6">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="text-4xl font-display">
                {link.name}
              </a>
            ))}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 rounded-full h-14">Sign in</Button>
            <Button className="flex-1 bg-accent rounded-full h-14" asChild>
              <a href="/onboarding">Get started</a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}