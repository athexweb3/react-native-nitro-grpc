/**
 * Converts a deadline to absolute milliseconds timestamp.
 *
 * @param deadline - Deadline as Date or relative milliseconds
 * @returns Absolute timestamp in milliseconds, or 0 for no deadline
 *
 * @example
 * ```typescript
 * toAbsoluteDeadline(new Date('2024-12-31')) // 1735689600000
 * toAbsoluteDeadline(5000) // Date.now() + 5000
 * toAbsoluteDeadline(undefined) // 0
 * ```
 */
export function toAbsoluteDeadline(deadline?: Date | number): number {
  if (!deadline) {
    return 0;
  }

  if (deadline instanceof Date) {
    return deadline.getTime();
  }

  // Relative milliseconds from now
  return Date.now() + deadline;
}

/**
 * Calculates remaining time until deadline.
 *
 * @param deadline - Deadline timestamp in milliseconds
 * @returns Remaining milliseconds, or Infinity if no deadline
 *
 * @example
 * ```typescript
 * const deadline = Date.now() + 5000;
 * getRemainingTime(deadline) // ~5000
 * ```
 */
export function getRemainingTime(deadline: number): number {
  if (deadline === 0) {
    return Infinity;
  }

  const remaining = deadline - Date.now();
  return Math.max(0, remaining);
}

/**
 * Checks if a deadline has expired.
 *
 * @param deadline - Deadline timestamp in milliseconds
 * @returns True if deadline has passed
 */
export function isDeadlineExpired(deadline: number): boolean {
  if (deadline === 0) {
    return false;
  }

  return Date.now() >= deadline;
}

/**
 * Creates a deadline from a timeout duration.
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns Absolute deadline timestamp
 *
 * @example
 * ```typescript
 * const deadline = createDeadline(5000); // 5 seconds from now
 * ```
 */
export function createDeadline(timeoutMs: number): number {
  return Date.now() + timeoutMs;
}

/**
 * Formats a deadline as a human-readable string.
 *
 * @param deadline - Deadline timestamp in milliseconds
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatDeadline(Date.now() + 5000) // "in 5s"
 * formatDeadline(Date.now() - 1000) // "1s ago"
 * ```
 */
export function formatDeadline(deadline: number): string {
  if (deadline === 0) {
    return 'no deadline';
  }

  const now = Date.now();
  const diff = deadline - now;
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  let timeStr: string;
  if (hours > 0) {
    timeStr = `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    timeStr = `${minutes}m ${seconds % 60}s`;
  } else {
    timeStr = `${seconds}s`;
  }

  return diff >= 0 ? `in ${timeStr}` : `${timeStr} ago`;
}
