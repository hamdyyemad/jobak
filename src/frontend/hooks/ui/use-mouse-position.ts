import { useState, useEffect } from "react";

/**
 * A custom hook that tracks the mouse position relative to the viewport.
 * Returns normalized coordinates between -0.5 and 0.5 for parallax effects.
 * 
 * @returns Object with x and y coordinates normalized to [-0.5, 0.5] range
 * 
 * @example
 * ```tsx
 * function ParallaxElement() {
 *   const mouse = useMousePosition();
 *   
 *   return (
 *     <div style={{ transform: `translate(${mouse.x * 100}px, ${mouse.y * 100}px)` }}>
 *       Parallax Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useMousePosition() {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Normalize values between -0.5 and 0.5
            setPosition({
                x: (e.clientX / window.innerWidth) - 0.5,
                y: (e.clientY / window.innerHeight) - 0.5,
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return position;
}