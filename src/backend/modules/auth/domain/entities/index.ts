/*
 * Note the explicit re-exports rather than `export *`.
 *
 * `session.entity` and `auth-token.entity` both define `isExpired` — the same
 * question asked of two different things — and a blanket re-export of both
 * would collide. Rather than renaming one to something worse at its own call
 * site, the predicates are qualified here.
 *
 * Importing straight from the entity file (`entities/session.entity`) is the
 * better habit anyway; this barrel exists for the common case of wanting the
 * types.
 */

export type { User, PublicUser } from "./user.entity";
export { toPublicUser, isEmailVerified, hasPassword } from "./user.entity";

export type { Session } from "./session.entity";
export {
  isUsable as isSessionUsable,
  isReuse as isSessionReuse,
  isRevoked as isSessionRevoked,
  isExpired as isSessionExpired,
} from "./session.entity";

export type { AuthToken, AuthTokenPurpose } from "./auth-token.entity";
export {
  isRedeemable as isAuthTokenRedeemable,
  isConsumed as isAuthTokenConsumed,
  isExpired as isAuthTokenExpired,
} from "./auth-token.entity";
