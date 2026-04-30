"use client";
import { useScrolled, useIsMobile } from "@/frontend/hooks";

import { DesktopNavigation } from "./desktop-nav";
import { MobileNavigation } from "./mobile-nav";

export function Navigation() {
  const isScrolled = useScrolled(50);
  const isMobile = useIsMobile();

  return isMobile ? (
    <MobileNavigation isScrolled={isScrolled} />
  ) : (
    <DesktopNavigation isScrolled={isScrolled} />
  );
}