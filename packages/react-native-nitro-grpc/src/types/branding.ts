/**
 * Strict Branded Types for gRPC.
 * Used to enforce semantic correctness of strings and numbers.
 */

/**
 * A gRPC method path in the format `/{Service}/{Method}`.
 * Example: `/greeter.Greeter/SayHello`
 */
export type MethodPath = `/${string}/${string}`;

/**
 * Extracts the Service Name from a MethodPath.
 */
export type ExtractService<T extends MethodPath> =
  T extends `/${infer S}/${string}` ? S : never;

/**
 * Extracts the Method Name from a MethodPath.
 */
export type ExtractMethod<T extends MethodPath> =
  T extends `/${string}/${infer M}` ? M : never;
