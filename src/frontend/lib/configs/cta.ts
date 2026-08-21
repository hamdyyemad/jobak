export interface Cta {
    text: string;
    href: string;
}

/** Where a signed-in visitor should go instead of signing up again. */
export const SIGNED_IN_CTA: Cta = {
    text: "Go to dashboard",
    href: "/dashboard",
};

/**
 * Resolves the primary call to action.
 *
 * Signed-out visitors get the page's own wording ("Start for free", "Find my
 * jobs", ...). Signed-in visitors get one consistent destination, because
 * inviting someone to create an account they already have is the bug this
 * exists to prevent.
 */
export function resolveCta(isAuthenticated: boolean, signedOutText: string): Cta {
    return isAuthenticated
        ? SIGNED_IN_CTA
        : { text: signedOutText, href: "/register" };
}
