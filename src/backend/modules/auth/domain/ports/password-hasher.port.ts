/**
 * Password hashing, kept behind an interface so the algorithm is one file's
 * business. bcrypt today; swapping to argon2 later should touch the
 * implementation and nothing else.
 */
export interface PasswordHasher {
  hash(plaintext: string): Promise<string>;

  /**
   * Implementations must compare in constant time, and must return false —
   * never throw — for a malformed hash or an empty one. A throw here would
   * turn "this account has no password" into a 500 instead of a clean
   * `InvalidCredentialsException`.
   */
  verify(plaintext: string, hash: string): Promise<boolean>;
}
