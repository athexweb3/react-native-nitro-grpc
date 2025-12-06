/**
 * Log levels for the interceptor.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

/**
 * Interface for a custom logger (e.g., winston, bunyan compatible).
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Configuration options for the LoggingInterceptor.
 */
export interface LoggingInterceptorOptions {
  /**
   * Minimum log level to output. Defaults to 'info'.
   */
  level?: LogLevel;

  /**
   * Sampling rate between 0.0 and 1.0.
   * 1.0 = log 100% of requests.
   * 0.1 = log 10% of requests.
   * Defaults to 1.0.
   */
  sampleRate?: number;

  /**
   * List of headers to redact from logs (case-insensitive).
   * Defaults to ['authorization', 'cookie', 'set-cookie'].
   */
  sensitiveHeaders?: string[];

  /**
   * List of message fields to redact from logs.
   * Supports dot notation for nested fields (e.g., 'user.password').
   */
  sensitiveFields?: string[];

  /**
   * Custom logger implementation. Defaults to console.
   */
  logger?: Logger;

  /**
   * Whether to log the full request/response body.
   * Defaults to true for 'debug' level, false otherwise.
   */
  logBody?: boolean;
}
