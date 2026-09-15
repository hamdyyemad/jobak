import type { AuthToken, AuthTokenPurpose } from "../entities/auth-token.entity";

export interface CreateAuthTokenInput {
  userId: string;
  tokenHash: string;
  purpose: AuthTokenPurpose;
  expiresAt: Date;
}

export interface AuthTokenRepository {
  create(input: CreateAuthTokenInput): Promise<AuthToken>;

  findByHash(hash: string): Promise<AuthToken | null>;

  /**
   * Marks the token used, returning false if it already was.
   *
   * The boolean matters: the check and the write have to be one statement, or
   * two requests carrying the same link can both pass a "not yet consumed"
   * check before either writes. Implementations must therefore do this as a
   * conditional UPDATE and report whether it matched — never read-then-write.
   */
  consume(tokenId: string, at: Date): Promise<boolean>;

  /**
   * Invalidates outstanding tokens when a new one is issued for the same
   * purpose, so requesting a second reset link retires the first. Without it,
   * every link ever mailed stays live until it expires.
   */
  invalidateOutstanding(
    userId: string,
    purpose: AuthTokenPurpose,
    at: Date,
  ): Promise<void>;
}
