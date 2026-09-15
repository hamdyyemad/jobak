import type { User } from "../entities/user.entity";

/**
 * Persistence for user identity.
 *
 * Lives in `domain` rather than beside its Postgres implementation so the
 * dependency arrow points inward: use cases import this interface,
 * infrastructure implements it, and nothing in `application` ever names `pg`.
 */

export interface CreateUserInput {
  email: string;
  passwordHash: string | null;
  fullName: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;

  /**
   * Case-insensitive, because `users.email` is CITEXT — callers must not
   * lowercase first, or an address stored as typed would stop matching.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Rejects a duplicate email at the database's unique index rather than by
   * checking first. A check-then-insert has a race in which two simultaneous
   * registrations both see "available"; the constraint does not.
   *
   * Implementations must translate that constraint violation into
   * `EmailTakenException` so callers do not have to know Postgres error codes.
   */
  create(input: CreateUserInput): Promise<User>;

  markEmailVerified(userId: string, at: Date): Promise<void>;

  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}
