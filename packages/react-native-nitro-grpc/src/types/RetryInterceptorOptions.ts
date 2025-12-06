import type { GrpcStatus } from './GrpcStatus';

/**
 * Configuration options for the RetryInterceptor.
 */
export interface RetryInterceptorOptions {
  /**
   * Maximum number of retry attempts (including the original call).
   * Default: 3
   */
  maxAttempts?: number;

  /**
   * Initial backoff delay in milliseconds.
   * Default: 100ms
   */
  initialBackoffMs?: number;

  /**
   * Maximum backoff delay in milliseconds.
   * Default: 5000ms
   */
  maxBackoffMs?: number;

  /**
   * Multiplier for exponential backoff.
   * Default: 1.5
   */
  backoffMultiplier?: number;

  /**
   * List of status codes that trigger a retry.
   * Default: [GrpcStatus.UNAVAILABLE]
   */
  retryableStatusCodes?: GrpcStatus[];
}
