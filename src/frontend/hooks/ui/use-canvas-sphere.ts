import { useEffect, useRef } from "react";

interface SpherePoint {
    x: number;
    y: number;
    z: number;
    char: string;
}

/**
 * A custom hook that renders an animated 3D ASCII sphere on a canvas element.
 * Handles canvas setup, device pixel ratio scaling, resize events, and render loop.
 * 
 * @param canvasRef - React ref to the canvas element where the sphere will be rendered
 * @param getPoints - Function that generates sphere points with coordinates and characters
 * 
 * @example
 * ```tsx
 * function AnimatedSphere() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   const { getPoints } = useSphereLogic(".:+*#%@");
 *   
 *   useCanvasSphere(canvasRef, getPoints);
 *   
 *   return <canvas ref={canvasRef} className="w-full h-full" />;
 * }
 * ```
 */
export function useCanvasSphere(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    getPoints: (width: number, height: number, radius: number) => SpherePoint[]
) {
    const frameRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        };

        const render = () => {
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Use a light color that works well on dark backgrounds
            const color = "157, 230, 166"; // Light green RGB for accent

            const radius = Math.min(rect.width, rect.height) * 0.45;
            const points = getPoints(rect.width, rect.height, radius);

            points.forEach((p) => {
                const alpha = 0.1 + (p.z + 1) * 0.4;
                const fontSize = 8 + (p.z + 1) * 4;

                ctx.fillStyle = `rgba(${color}, ${alpha})`;
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.textAlign = "center";
                ctx.fillText(p.char, p.x, p.y);
            });

            frameRef.current = requestAnimationFrame(render);
        };

        resize();
        window.addEventListener("resize", resize);
        render();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(frameRef.current);
        };
    }, [canvasRef, getPoints]);
}