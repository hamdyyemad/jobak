import { AuthException } from "./auth.exception";

/**
 * The token was genuine but its window has passed.
 *
 * Separate from `InvalidTokenException` because the user can act on it: the
 * link was real, it simply went stale, and "request a new one" will work.
 * Saying "invalid" there sends people hunting for a problem that isn't theirs.
 */
export class TokenExpiredException extends AuthException {
  constructor() {
    super("token_expired", "That link has expired. Please request a new one.");
  }
}
