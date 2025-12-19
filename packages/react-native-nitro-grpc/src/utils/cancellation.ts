import { GrpcError } from '../types/grpc-error';
import { GrpcStatus } from '../types/grpc-status';

/**
 * Checks if an AbortSignal has been aborted.
 * @internal
 */
export function checkAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new GrpcError(GrpcStatus.CANCELLED, 'Call cancelled via AbortSignal');
  }
}
