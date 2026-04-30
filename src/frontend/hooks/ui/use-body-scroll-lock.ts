import { useEffect } from "react";

/**
 * A custom hook that locks or unlocks scrolling on the document body.
 * Useful for modals, mobile menus, and overlays that should prevent background scrolling.
 * 
 * @param isLocked - Whether the body scroll should be locked (true) or unlocked (false)
 * 
 * @example
 * ```tsx
 * function MobileMenu() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   useBodyScrollLock(isOpen);
 *   
 *   return (
 *     <div className={isOpen ? 'menu-open' : 'menu-closed'}>
 *       Menu content
 *     </div>
 *   );
 * }
 * ```
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (isLocked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup: restore original overflow when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
}
