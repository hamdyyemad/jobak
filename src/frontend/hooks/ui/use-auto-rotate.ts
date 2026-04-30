"use client";
import { useEffect, useState } from "react";

/**
 * A custom hook that automatically rotates through a sequence of indices at a specified interval.
 * Useful for carousels, slideshows, and tab rotation.
 * 
 * @param length - Total number of items to rotate through
 * @param intervalMs - Rotation interval in milliseconds, defaults to 5000ms (5 seconds)
 * @returns Object with current activeIndex and setActiveIndex function to manually control
 * 
 * @example
 * ```tsx
 * function Carousel() {
 *   const { activeIndex, setActiveIndex } = useAutoRotate(items.length, 3000);
 *   
 *   return (
 *     <div>
 *       <div>{items[activeIndex].content}</div>
 *       <button onClick={() => setActiveIndex(activeIndex + 1)}>Next</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutoRotate(length: number, intervalMs: number = 5000) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [length, intervalMs]);

  return { activeIndex, setActiveIndex };
}
