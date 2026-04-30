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
export function useSphereLogic(chars: string) {
    const timeRef = useRef(0);

    const getPoints = useCallback((width: number, height: number, radius: number) => {
        const points: SpherePoint[] = [];
        const step = 0.22; // Control density
        const centerX = width / 2;
        const centerY = height / 2;
        const t = timeRef.current;

        for (let phi = 0; phi < Math.PI * 2; phi += step) {
            for (let theta = 0; theta < Math.PI; theta += step) {
                // Base Sphere
                const x = Math.sin(theta) * Math.cos(phi);
                const y = Math.sin(theta) * Math.sin(phi);
                const z = Math.cos(theta);

                // Rotation Math
                const rX = t * 0.2;
                const rY = t * 0.3;

                // Apply Rotations
                const nx = x * Math.cos(rY) - z * Math.sin(rY);
                const nz = x * Math.sin(rY) + z * Math.cos(rY);
                const ny = y * Math.cos(rX) - nz * Math.sin(rX);
                const fz = y * Math.sin(rX) + nz * Math.cos(rX);

                const depth = (fz + 1) / 2;
                const char = chars[Math.floor(depth * (chars.length - 1))];

                points.push({
                    x: centerX + nx * radius,
                    y: centerY + ny * radius,
                    z: fz,
                    char,
                });
            }
        }

        timeRef.current += 0.01;
        // Return sorted by Z-index (Back to Front)
        return points.sort((a, b) => a.z - b.z);
    }, [chars]);

    return { getPoints };
}