import { GrpcError } from '../types/GrpcError';
import { GrpcStatus } from '../types/GrpcStatus';

/**
 * Type guard to check if an error is a GrpcError.
 *
 * @param error - Unknown error to check
 * @returns True if error is a GrpcError instance
 *
 * @example
 * ```typescript
 * try {
 *   await client.unaryCall(...);
 * } catch (error) {
 *   if (isGrpcError(error)) {
 *     console.log(`gRPC error: ${error.code}`);
 *   }
 * }
 * ```
 */
export function isGrpcError(error: unknown): error is GrpcError {
  return error instanceof GrpcError;
}

/**
 * Type guard to check if a value is likely a gRPC status code.
 *
 * @param value - Value to check
 * @returns True if value is a number within valid GrpcStatus range
 */
export function isGrpcStatusCode(value: unknown): value is GrpcStatus {
  return typeof value === 'number' && value >= 0 && value <= 16;
}

/**
 * Gets a human-readable description for a gRPC status code.
 *
 * @param code - GrpcStatus code
 * @returns Description string
 *
 * @example
 * ```typescript
 * getStatusDescription(GrpcStatus.UNAVAILABLE)
 * // Returns: "The service is currently unavailable"
 * ```
 */
export function getStatusDescription(code: GrpcStatus): string {
  switch (code) {
    case GrpcStatus.OK:
      return 'The operation completed successfully';
    case GrpcStatus.CANCELLED:
      return 'The operation was cancelled';
    case GrpcStatus.UNKNOWN:
      return 'Unknown error occurred';
    case GrpcStatus.INVALID_ARGUMENT:
      return 'Client specified an invalid argument';
    case GrpcStatus.DEADLINE_EXCEEDED:
      return 'Deadline expired before operation could complete';
    case GrpcStatus.NOT_FOUND:
      return 'Requested entity was not found';
    case GrpcStatus.ALREADY_EXISTS:
      return 'Entity already exists';
    case GrpcStatus.PERMISSION_DENIED:
      return 'Permission denied';
    case GrpcStatus.RESOURCE_EXHAUSTED:
      return 'Resource has been exhausted';
    case GrpcStatus.FAILED_PRECONDITION:
      return 'Operation was rejected because the system is not in a required state';
    case GrpcStatus.ABORTED:
      return 'The operation was aborted';
    case GrpcStatus.OUT_OF_RANGE:
      return 'Operation attempted past valid range';
    case GrpcStatus.UNIMPLEMENTED:
      return 'Operation is not implemented or not supported';
    case GrpcStatus.INTERNAL:
      return 'Internal server error';
    case GrpcStatus.UNAVAILABLE:
      return 'The service is currently unavailable';
    case GrpcStatus.DATA_LOSS:
      return 'Unrecoverable data loss or corruption';
    case GrpcStatus.UNAUTHENTICATED:
      return 'Request does not have valid authentication credentials';
    default:
      return 'Unknown status code';
  }
}

/**
 * Checks if a status code indicates a successful operation.
 *
 * @param code - GrpcStatus code
 * @returns True if status is OK
 */
export function isStatusOk(code: GrpcStatus): code is GrpcStatus.OK {
  return code === GrpcStatus.OK;
}

/**
 * Checks if a status code indicates a retryable error.
 * Typically UNAVAILABLE, DEADLINE_EXCEEDED, and RESOURCE_EXHAUSTED are retryable.
 *
 * @param code - GrpcStatus code
 * @returns True if the error might be resolved by retrying
 */
export function isRetryableStatus(code: GrpcStatus): boolean {
  return (
    code === GrpcStatus.UNAVAILABLE ||
    code === GrpcStatus.DEADLINE_EXCEEDED ||
    code === GrpcStatus.RESOURCE_EXHAUSTED ||
    code === GrpcStatus.ABORTED
  );
}

/**
 * Checks if a status code indicates a client error (4xx equivalent).
 *
 * @param code - GrpcStatus code
 * @returns True if error is due to client mistake
 */
export function isClientError(code: GrpcStatus): boolean {
  return (
    code === GrpcStatus.INVALID_ARGUMENT ||
    code === GrpcStatus.NOT_FOUND ||
    code === GrpcStatus.ALREADY_EXISTS ||
    code === GrpcStatus.PERMISSION_DENIED ||
    code === GrpcStatus.FAILED_PRECONDITION ||
    code === GrpcStatus.OUT_OF_RANGE ||
    code === GrpcStatus.UNAUTHENTICATED
  );
}

/**
 * Checks if a status code indicates a server error (5xx equivalent).
 *
 * @param code - GrpcStatus code
 * @returns True if error is due to server issue
 */
export function isServerError(code: GrpcStatus): boolean {
  return (
    code === GrpcStatus.UNKNOWN ||
    code === GrpcStatus.INTERNAL ||
    code === GrpcStatus.UNAVAILABLE ||
    code === GrpcStatus.DATA_LOSS ||
    code === GrpcStatus.UNIMPLEMENTED
  );
}
