import { GrpcStatus } from './grpc-status';
import { GrpcMetadata } from './metadata';

/**
 * gRPC-specific error class that extends the standard Error.
 * Contains status code, details message, and optional trailing metadata from the server.
 *
 * @example
 * ```typescript
 * try {
 *   await client.unaryCall(...);
 * } catch (error) {
 *   if (error instanceof GrpcError) {
 *     console.log(`gRPC error: ${error.code} - ${error.details}`);
 *     const authError = error.metadata?.get('www-authenticate');
 *   }
 * }
 * ```
 */
export class GrpcError extends Error {
  /**
   * gRPC status code (see GrpcStatus enum).
   */
  public readonly code: GrpcStatus;

  /**
   * Human-readable error details from the server.
   */
  public readonly details?: string;

  /**
   * Trailing metadata sent by the server with the error (optional).
   * May contain additional error context or debug information.
   */
  public readonly metadata?: GrpcMetadata;

  /**
   * The underlying cause of this error.
   */
  public readonly cause?: unknown;

  constructor(
    code: GrpcStatus,
    message: string,
    cause?: unknown,
    details?: string,
    metadata?: GrpcMetadata
  ) {
    // Standard Error constructor only takes message in older libs
    super(message);

    // Set the prototype explicitly (required for extending built-in classes in TS)
    Object.setPrototypeOf(this, GrpcError.prototype);

    this.name = 'GrpcError';
    this.code = code;
    this.details = details;
    this.metadata = metadata;
    this.cause = cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ('captureStackTrace' in Error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Error as any).captureStackTrace(this, GrpcError);
    }
  }

  /**
   * Creates a GrpcError from a C++ response.
   *
   * @internal
   * @param code - Numeric status code
   * @param message - Error message
   * @param metadataJson - Optional JSON-serialized metadata
   * @returns GrpcError instance
   */
  static fromCpp(
    code: number,
    message: string,
    metadataJson?: string
  ): GrpcError {
    const grpcCode = code as GrpcStatus;
    let metadata: GrpcMetadata | undefined;

    if (metadataJson) {
      try {
        const parsed = JSON.parse(metadataJson);
        metadata = GrpcMetadata.fromJSON(parsed);
      } catch (e) {
        console.warn('[GrpcError] Failed to parse metadata JSON:', e);
      }
    }

    return new GrpcError(grpcCode, message, metadata);
  }

  /**
   * Checks if the error is a specific status code.
   *
   * @param code - GrpcStatus to check
   * @returns True if error matches the status code
   */
  is(code: GrpcStatus): boolean {
    return this.code === code;
  }

  /**
   * Checks if the error is retryable based on status code.
   * Typically UNAVAILABLE, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED are retryable.
   *
   * @returns True if the error might be resolved by retrying
   */
  isRetryable(): boolean {
    return (
      this.code === GrpcStatus.UNAVAILABLE ||
      this.code === GrpcStatus.DEADLINE_EXCEEDED ||
      this.code === GrpcStatus.RESOURCE_EXHAUSTED
    );
  }
}
