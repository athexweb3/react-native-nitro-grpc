import type { GrpcMetadata } from './GrpcMetadata';
import type { GrpcCallCredentials } from './GrpcCredentials';

/**
 * Options for configuring individual gRPC calls.
 *
 * @example
 * ```typescript
 * const options: GrpcCallOptions = {
 *   deadline: new Date(Date.now() + 5000), // 5 second timeout
 *   metadata: new GrpcMetadata(),
 *   signal: abortController.signal, // For cancellation
 * };
 * ```
 */
export interface GrpcCallOptions {
  /**
   * Deadline for the call.
   * Can be an absolute Date or milliseconds from now.
   * If exceeded, the call fails with DEADLINE_EXCEEDED status.
   */
  deadline?: Date | number;

  /**
   * Metadata (HTTP/2 headers) to send with the call.
   */
  metadata?: GrpcMetadata;

  /**
   * Per-call authentication credentials.
   * Applied in addition to channel credentials.
   */
  credentials?: GrpcCallCredentials;

  /**
   * AbortSignal for cancelling the call.
   * When aborted, the call fails with CANCELLED status.
   *
   * @example
   * ```typescript
   * const controller = new AbortController();
   * setTimeout(() => controller.abort(), 3000);
   * await client.unaryCall(method, request, { signal: controller.signal });
   * ```
   */
  signal?: AbortSignal;

  /**
   * Propagation flags for cascading cancellations and deadlines.
   * Advanced: Typically not needed in most applications.
   */
  propagateFlags?: number;
}
