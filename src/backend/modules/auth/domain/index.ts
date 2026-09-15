/**
 * The domain layer's surface.
 *
 * Pure by construction: nothing under `domain/` imports from `application`,
 * `infrastructure` or `interface`, and nothing here reaches for a database, a
 * cookie or the network. That is what makes these rules testable without any
 * setup, and it is worth keeping — a single import of `pg` in this folder ends
 * that property for the whole layer.
 *
 *   entities/      what things are
 *   value-objects/ validated primitives that cannot be constructed invalid
 *   policies/      the decisions (lifetimes, thresholds)
 *   ports/         what the outside world must provide
 *   exceptions/    what can go wrong, as types
 */

export * from "./entities";
export * from "./value-objects";
export * from "./policies";
export * from "./ports";
export * from "./exceptions";
