"use client";
import { useEffect, useState } from "react";

/**
 * Hook to detect if the viewport is mobile-sized (below md breakpoint: 768px)
 * 
 * @returns {boolean} true if viewport width is below 768px, false otherwise
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMobile = useIsMobile();
 *   
 *   return isMobile ? <MobileView /> : <DesktopView />;
 * }
 * ```
 */
export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if window is defined (client-side)
        if (typeof window === "undefined") return;

        // Create media query for mobile breakpoint (md: 768px in Tailwind)
        const mediaQuery = window.matchMedia("(max-width: 767px)");

        // Set initial value
        setIsMobile(mediaQuery.matches);

        // Handler for media query changes
        const handleChange = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches);
        };

        // Add listener
        mediaQuery.addEventListener("change", handleChange);

        // Cleanup
        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return isMobile;
}
