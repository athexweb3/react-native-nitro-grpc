import type {
  GrpcInterceptor,
  NextUnaryFn,
  UnaryInterceptor,
} from '../types/GrpcInterceptor';
import type { RetryInterceptorOptions } from '../types/RetryInterceptorOptions';
import type { GrpcCallOptions } from '../types/GrpcCallOptions';
import { GrpcStatus } from '../types/GrpcStatus';
import { GrpcError } from '../types/GrpcError';

/**
 * An interceptor that automatically retries failed calls based on a policy.
 * Implements exponential backoff with jitter.
 */
export class RetryInterceptor implements GrpcInterceptor {
  private readonly options: Required<RetryInterceptorOptions>;

  constructor(options: RetryInterceptorOptions = {}) {
    this.options = {
      maxAttempts: options.maxAttempts ?? 3,
      initialBackoffMs: options.initialBackoffMs ?? 100,
      maxBackoffMs: options.maxBackoffMs ?? 5000,
      backoffMultiplier: options.backoffMultiplier ?? 1.5,
      // Default to retrying UNAVAILABLE (14)
      retryableStatusCodes: options.retryableStatusCodes ?? [14],
    };
  }

  unary: UnaryInterceptor = async <Req, Res>(
    method: string,
    request: Req,
    options: GrpcCallOptions,
    next: NextUnaryFn
  ): Promise<Res> => {
    let attempt = 1;
    let currentBackoff = this.options.initialBackoffMs;

    // loops until success or max attempts reached

    while (true) {
      try {
        return await next(method, request, options);
      } catch (error) {
        if (attempt >= this.options.maxAttempts) {
          throw error;
        }

        const status =
          error instanceof GrpcError ? error.code : GrpcStatus.UNKNOWN;

        if (!this.options.retryableStatusCodes.includes(status)) {
          throw error;
        }

        // Calculate delay with Jitter: delay ± 20%
        // Full jitter formula: random_between(0, min(cap, base * 2 ** attempt))
        // We use the simpler "Equally Distributed Jitter" approach for now
        const jitter = currentBackoff * 0.2 * (Math.random() * 2 - 1);
        const delay = Math.min(
          this.options.maxBackoffMs,
          currentBackoff + jitter
        );

        if (delay > 0) {
          await new Promise<void>((resolve) =>
            setTimeout(() => resolve(), delay)
          );
        }

        currentBackoff *= this.options.backoffMultiplier;
        attempt++;
      }
    }
  };
}
