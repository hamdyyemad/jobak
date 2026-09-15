/**
 * Minting and verifying the two token types.
 *
 * They are deliberately different kinds of thing: the access token is a signed
 * JWT that carries its own proof, while the refresh token is opaque randomness
 * whose only meaning is the row it matches. Putting both behind one interface
 * keeps that asymmetry in a single implementation rather than spread across
 * use cases.
 */

export interface AccessTokenClaims {
  /** The user id. Named for the JWT registered claim it maps to. */
  sub: string;
  /**
   * The session that issued this token. Lets a revoked session invalidate its
   * access tokens at the next check, instead of them outliving the sign-out by
   * their full lifetime.
   */
  sid: string;
}

export interface RefreshTokenPair {
  /** Goes to the user's cookie. The only plaintext copy. */
  token: string;
  /** Goes to the database. */
  hash: string;
}

export interface TokenService {
  signAccessToken(claims: AccessTokenClaims): Promise<string>;

  /**
   * Returns null for anything that does not verify — expired, tampered, wrong
   * algorithm, or junk. Never throws: an invalid token is an ordinary outcome
   * on a public endpoint, not an exceptional one.
   */
  verifyAccessToken(token: string): Promise<AccessTokenClaims | null>;

  /** A fresh, high-entropy opaque token plus the hash to store against it. */
  generateRefreshToken(): RefreshTokenPair;

  /** Same hash function as above, for looking up a presented token. */
  hashRefreshToken(token: string): string;
}
