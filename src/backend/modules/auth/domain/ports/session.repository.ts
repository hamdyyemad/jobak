import type { Session } from "../entities/session.entity";

export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<Session>;

  findByRefreshTokenHash(hash: string): Promise<Session | null>;

  /**
   * Atomically revokes `sessionId` and creates its replacement, linking the old
   * row to the new one via `replaced_by`.
   *
   * One operation rather than two because a crash between them would either
   * strand the user with a revoked token and no successor, or leave two live
   * tokens where there should be one.
   */
  rotate(sessionId: string, next: CreateSessionInput): Promise<Session>;

  revoke(sessionId: string, at: Date): Promise<void>;

  /**
   * Ends every session the user has. Used on reuse detection and after a
   * password change — both cases where one compromised credential means none
   * of the others can be trusted either.
   */
  revokeAllForUser(userId: string, at: Date): Promise<void>;

  touchLastUsed(sessionId: string, at: Date): Promise<void>;
}
