import { useEffect } from "react";

interface SpherePoint {
    x: number;
    y: number;
    z: number;
    char: string;
}

const TARGET_FPS = 30;
const FRAME_BUDGET_MS = 1000 / TARGET_FPS;
const MAX_DPR = 2;
const ACCENT_RGB = "157, 230, 166"; // Light green that reads well on dark backgrounds

/**
 * A custom hook that renders an animated 3D ASCII sphere on a canvas element.
 * Handles canvas setup, device pixel ratio scaling, resize events, and render loop.
 *
 * The loop is deliberately conservative about main-thread cost:
 * - dimensions are measured by a ResizeObserver, never inside the frame (no forced layout on scroll)
 * - rendering stops entirely when the canvas leaves the viewport or the tab is hidden
 * - frames are capped at 30fps and `font`/`fillStyle` are only reassigned when they change
 * - `prefers-reduced-motion` gets a single static frame
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
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

        let frameId = 0;
        let running = false;
        let inView = false;
        let lastFrameAt = 0;
        let width = 0;
        let height = 0;

        const measure = (rectWidth: number, rectHeight: number) => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            width = rectWidth;
            height = rectHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            // Setting width/height resets the context, so re-apply the scale each time
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.textAlign = "center";
        };

        const draw = () => {
            if (width === 0 || height === 0) return;

            ctx.clearRect(0, 0, width, height);

            const radius = Math.min(width, height) * 0.45;
            const points = getPoints(width, height, radius);

            // Points arrive sorted by depth, so quantising size/alpha makes these
            // state changes monotonic — a handful per frame instead of one per point.
            let currentFont = "";
            let currentFill = "";

            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const depth = p.z + 1;

                const font = `bold ${Math.round(8 + depth * 4)}px monospace`;
                if (font !== currentFont) {
                    ctx.font = font;
                    currentFont = font;
                }

                const alpha = Math.round((0.1 + depth * 0.4) * 20) / 20;
                const fill = `rgba(${ACCENT_RGB}, ${alpha})`;
                if (fill !== currentFill) {
                    ctx.fillStyle = fill;
                    currentFill = fill;
                }

                ctx.fillText(p.char, p.x, p.y);
            }
        };

        const loop = (now: number) => {
            frameId = requestAnimationFrame(loop);
            if (now - lastFrameAt < FRAME_BUDGET_MS) return;
            lastFrameAt = now;
            draw();
        };

        const stop = () => {
            if (!running) return;
            running = false;
            cancelAnimationFrame(frameId);
        };

        const start = () => {
            if (running) return;
            running = true;
            lastFrameAt = 0;
            frameId = requestAnimationFrame(loop);
        };

        // Only burn frames when the sphere is actually on screen and animation is wanted
        const sync = () => {
            if (inView && !document.hidden && !reducedMotion.matches) start();
            else stop();

            if (inView && reducedMotion.matches) draw();
        };

        const resizeObserver = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect) return;
            measure(rect.width, rect.height);
            if (!running) draw();
        });
        resizeObserver.observe(canvas);

        const intersectionObserver = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting;
                sync();
            },
            { rootMargin: "200px" }
        );
        intersectionObserver.observe(canvas);

        // No initial getBoundingClientRect(): the ResizeObserver above delivers the
        // starting size on its first callback, without forcing a layout at mount.
        document.addEventListener("visibilitychange", sync);
        reducedMotion.addEventListener("change", sync);

        return () => {
            stop();
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
            document.removeEventListener("visibilitychange", sync);
            reducedMotion.removeEventListener("change", sync);
        };
    }, [canvasRef, getPoints]);
}
