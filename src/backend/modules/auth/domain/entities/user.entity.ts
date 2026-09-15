/**
 * The user as the auth module understands them: identity and credentials only.
 *
 * Profile, preferences and onboarding state deliberately live in other tables
 * and other modules. Auth answers "who is this and may they in", nothing more —
 * widening this type is how a module stops having a boundary.
 */

export interface User {
  id: string;
  email: string;
  /**
   * Null for an account with no password — an OAuth-only signup, once that
   * exists. Verification must read null as "password login unavailable", never
   * as "any password will do".
   */
  passwordHash: string | null;
  fullName: string | null;
  /** Null until confirmed. A timestamp, so "when" is answerable. */
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * What leaves the module.
 *
 * `passwordHash` is absent by construction rather than by remembering to delete
 * it — a hash is still a credential, and one that reaches a client component or
 * a JSON response is a leak. Anything crossing the module boundary should be
 * this type, not `User`.
 */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt,
  };
}

export const isEmailVerified = (user: User) => user.emailVerifiedAt !== null;

/** True when this account can be signed into with a password at all. */
export const hasPassword = (user: User) => user.passwordHash !== null;
