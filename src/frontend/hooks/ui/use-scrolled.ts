import { useState, useEffect } from "react";

/**
 * A custom hook that tracks whether the page has been scrolled past a certain threshold.
 *
 * Implemented with a zero-height sentinel at the top of the document rather than a
 * scroll listener: reading `window.scrollY` forces a synchronous layout, and doing
 * that on every scroll event (or even once per frame) shows up as reflow on the
 * critical path. An IntersectionObserver reports the same thing off the main thread.
 *
 * @param threshold - The scroll position in pixels to trigger the scrolled state (default: 20)
 * @returns A boolean indicating whether the page has scrolled past the threshold
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isScrolled = useScrolled(50);
 *   return <div className={isScrolled ? 'scrolled' : ''}>
 *     Content
 *   </div>
 * }
 * ```
 */
export function useScrolled(threshold: number = 20) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    // Sits at the very top of the document and is `threshold + 1`px tall, so it
    // stops intersecting the viewport exactly when scrollY > threshold.
    // It has no background or content, so it paints nothing — note that hiding it
    // with `visibility:hidden` would stop IntersectionObserver reporting updates.
    sentinel.style.cssText = `position:absolute;top:0;left:0;width:1px;height:${
      threshold + 1
    }px;pointer-events:none;`;
    document.body.appendChild(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, [threshold]);

  return isScrolled;
}
