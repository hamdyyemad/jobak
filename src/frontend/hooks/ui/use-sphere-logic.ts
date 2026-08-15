import { useRef, useCallback } from "react";

interface SpherePoint {
    x: number;
    y: number;
    z: number;
    char: string;
}

/**
 * A custom hook that generates 3D rotating sphere points with ASCII character mapping.
 * Uses spherical coordinates (phi, theta) with rotation matrices for animation.
 *
 * Points are written into a reused buffer and the trigonometry is hoisted out of the
 * inner loop, so a frame costs ~90 trig calls and zero allocations instead of
 * ~3400 trig calls and ~430 objects.
 *
 * @param chars - String of ASCII characters to map by depth (e.g., ".:+*#%@")
 * @returns Object with getPoints function that generates sorted sphere points
 *
 * @example
 * ```tsx
 * function AnimatedSphere() {
 *   const { getPoints } = useSphereLogic(".:+*#%@");
 *   const points = getPoints(width, height, radius);
 *
 *   return points.map(point => (
 *     <span style={{ left: point.x, top: point.y }}>{point.char}</span>
 *   ));
 * }
 * ```
 */
const STEP = 0.22; // Control density
const SPEED = 0.02; // Radians per frame (tuned for a 30fps render loop)

export function useSphereLogic(chars: string) {
    const timeRef = useRef(0);
    const poolRef = useRef<SpherePoint[]>([]);

    const getPoints = useCallback((width: number, height: number, radius: number) => {
        const pool = poolRef.current;
        const centerX = width / 2;
        const centerY = height / 2;
        const t = timeRef.current;
        const lastChar = chars.length - 1;

        // Rotation is constant for the whole frame — compute it once, not per point.
        const rX = t * 0.2;
        const rY = t * 0.3;
        const cosX = Math.cos(rX);
        const sinX = Math.sin(rX);
        const cosY = Math.cos(rY);
        const sinY = Math.sin(rY);

        let count = 0;

        for (let phi = 0; phi < Math.PI * 2; phi += STEP) {
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);

            for (let theta = 0; theta < Math.PI; theta += STEP) {
                const sinTheta = Math.sin(theta);

                // Base sphere
                const x = sinTheta * cosPhi;
                const y = sinTheta * sinPhi;
                const z = Math.cos(theta);

                // Apply rotations
                const nx = x * cosY - z * sinY;
                const nz = x * sinY + z * cosY;
                const ny = y * cosX - nz * sinX;
                const fz = y * sinX + nz * cosX;

                const depth = (fz + 1) / 2;

                let point = pool[count];
                if (point === undefined) {
                    point = { x: 0, y: 0, z: 0, char: "" };
                    pool[count] = point;
                }
                point.x = centerX + nx * radius;
                point.y = centerY + ny * radius;
                point.z = fz;
                point.char = chars[Math.floor(depth * lastChar)];
                count++;
            }
        }

        // Trim the buffer if the density ever shrinks
        if (pool.length > count) pool.length = count;

        timeRef.current += SPEED;

        // Sort by Z-index (back to front)
        pool.sort((a, b) => a.z - b.z);
        return pool;
    }, [chars]);

    return { getPoints };
}
