"use client";
import { useScrolled } from "@/frontend/hooks";

import { DesktopNavigation } from "./desktop-nav";
import { MobileNavigation } from "./mobile-nav";

export function Navigation() {
  const isScrolled = useScrolled(50);

  // Both variants render and are toggled with CSS. Picking one from a JS media
  // query meant the server sent the desktop nav and the client tore it down and
  // rebuilt the mobile one on hydration.
  return (
    <>
      <MobileNavigation isScrolled={isScrolled} />
      <DesktopNavigation isScrolled={isScrolled} />
    </>
  );
}
