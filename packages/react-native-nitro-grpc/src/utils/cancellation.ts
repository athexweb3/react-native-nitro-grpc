import { GrpcError } from '../types/GrpcError';
import { GrpcStatus } from '../types/GrpcStatus';

/**
 * Checks if an AbortSignal has been aborted.
 * @internal
 */
export function checkAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new GrpcError(GrpcStatus.CANCELLED, 'Call cancelled via AbortSignal');
  }
}
