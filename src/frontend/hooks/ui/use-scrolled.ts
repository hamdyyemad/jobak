import { useState, useEffect } from "react";

/**
 * A custom hook that tracks whether the page has been scrolled past a certain threshold.
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return isScrolled;
}
