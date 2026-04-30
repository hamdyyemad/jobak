"use client";
import { useEffect, useRef, useState } from "react";

/**
 * A custom hook that detects when an element becomes visible in the viewport.
 * Uses IntersectionObserver to trigger a visibility state change with optional performance optimizations.
 * 
 * @param options - Configuration object for the intersection observer
 * @param options.threshold - Percentage of element visibility required to trigger (0-1), defaults to 0.1
 * @param options.rootMargin - Margin around the root element for early/late triggering (e.g., "100px"), defaults to "0px"
 * @param options.triggerOnce - Stop observing after first visibility for performance optimization, defaults to true
 * @returns Object with ref to attach to element and isVisible boolean state
 * 
 * @example
 * ```tsx
 * // Basic usage with defaults
 * function AnimatedSection() {
 *   const { ref, isVisible } = useIntersectionVisible();
 *   
 *   return (
 *     <div ref={ref} className={isVisible ? "fade-in" : "opacity-0"}>
 *       Content appears when scrolled into view
 *     </div>
 *   );
 * }
 * 
 * // Advanced: trigger earlier and keep observing
 * function ScrollTracker() {
 *   const { ref, isVisible } = useIntersectionVisible({
 *     threshold: 0.5,
 *     rootMargin: "100px",
 *     triggerOnce: false
 *   });
 *   
 *   return <div ref={ref}>{isVisible ? "Visible" : "Hidden"}</div>;
 * }
 * ```
 */

interface Options {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean; // New: stop observing after first visibility
}

export function useIntersectionVisible<T extends HTMLElement = HTMLElement>({
    threshold = 0.1,
    rootMargin = "0px",
    triggerOnce = true,
}: Options = {}) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<T | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element || isVisible) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);

                    // Optimization: Stop watching this element once it's visible
                    if (triggerOnce && element) {
                        observer.unobserve(element);
                    }
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            if (element) observer.unobserve(element);
            observer.disconnect();
        };
    }, [threshold, rootMargin, triggerOnce, isVisible]);

    return { ref, isVisible };
}