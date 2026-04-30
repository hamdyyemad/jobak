import { useState, useEffect } from "react";

/**
 * A custom hook that cycles through indices at a specified interval.
 * Useful for rotating content like text, images, or testimonials.
 * 
 * @param length - The total number of items to cycle through
 * @param intervalMs - The time in milliseconds between each cycle (default: 2500)
 * @returns The current index in the cycle
 * 
 * @example
 * ```tsx
 * function RotatingText() {
 *   const items = ["Hello", "World", "React"];
 *   const currentIndex = useCycleIndex(items.length, 3000);
 *   
 *   return <h1>{items[currentIndex]}</h1>;
 * }
 * ```
 */
export function useCycleIndex(length: number, intervalMs: number = 2500) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % length);
        }, intervalMs);

        return () => clearInterval(interval);
    }, [length, intervalMs]);

    return index;
}
