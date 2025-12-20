import type { GrpcCallOptions } from '../types/call-options';
import type {
  GrpcInterceptor,
  NextUnaryFn,
  UnaryInterceptor,
} from '../types/interceptor';
import type {
  Logger,
  LoggingInterceptorOptions,
  LogLevel,
} from '../types/logging-interceptor-options';
import { GrpcMetadata } from '../types/metadata';

/**
 * A production-grade gRPC logging interceptor.
 * Features:
 * - Structured JSON logging
 * - Header/Body redaction for sensitive data
 * - Sampling for high-traffic environments
 * - Performance metrics (duration)
 */
export class LoggingInterceptor implements GrpcInterceptor {
  private readonly options: Required<LoggingInterceptorOptions>;
  private readonly logger: Logger;

  constructor(options: LoggingInterceptorOptions = {}) {
    this.options = {
      level: options.level || 'info',
      sampleRate: options.sampleRate ?? 1.0,
      sensitiveHeaders: (
        options.sensitiveHeaders || ['authorization', 'cookie', 'set-cookie']
      ).map((h) => h.toLowerCase()),
      sensitiveFields: options.sensitiveFields || [
        'password',
        'token',
        'secret',
        'apikey',
      ],
      logger: options.logger || console,
      logBody: options.logBody ?? false,
    };
    this.logger = this.options.logger;
  }

  unary: UnaryInterceptor = async <Req, Res>(
    method: import('../types/branding').MethodPath,
    request: Req,
    options: Readonly<GrpcCallOptions>,
    next: NextUnaryFn
  ): Promise<Res> => {
    // 1. Sampling Check
    if (Math.random() > this.options.sampleRate) {
      return next(method, request, options);
    }

    const { level, logBody } = this.options;
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    // 2. Prepare Metadata (Redacted)
    const metadata = options.metadata || new GrpcMetadata();
    const redactedMetadata = this.redactMetadata(metadata);

    // 3. Log Start
    if (this.shouldLog('debug')) {
      this.log('debug', 'gRPC Request Started', {
        requestId,
        method,
        metadata: redactedMetadata,
        body: logBody ? this.redactBody(request) : '[HIDDEN]',
      });
    } else if (this.shouldLog('info')) {
      this.log('info', `gRPC Request: ${method}`, { requestId });
    }

    try {
      // 4. Execute Call
      const response = await next<Req, Res>(method, request, options);
      const duration = Date.now() - startTime;

      // 5. Log Success
      if (this.shouldLog(level)) {
        this.log(level, `gRPC Response: ${method}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status: 'OK',
          body: logBody ? this.redactBody(response) : '[HIDDEN]',
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 6. Log Error
      this.log('error', `gRPC Error: ${method}`, {
        requestId,
        duration: `${duration.toFixed(2)}ms`,
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  serverStreaming: import('../types/interceptor').ServerStreamingInterceptor = <
    Req,
    Res
  >(
    method: import('../types/branding').MethodPath,
    request: Req,
    options: Readonly<GrpcCallOptions>,
    next: import('../types/interceptor').NextServerStreamingFn
  ): import('../types/stream').ServerStream<Res> => {
    // 1. Sampling Check
    if (Math.random() > this.options.sampleRate) {
      return next(method, request, options);
    }

    const { logBody } = this.options;
    const requestId = Math.random().toString(36).substring(7);

    // 2. Log Start
    this.log('info', `gRPC Server Stream Started: ${method}`, {
      requestId,
      type: 'server-streaming',
    });

    // 3. Create Stream
    const stream = next<Req, Res>(method, request, options);

    // 4. Intercept Events
    stream.on('data', (data) => {
      if (this.shouldLog('debug')) {
        this.log('debug', `gRPC Stream Data: ${method}`, {
          requestId,
          direction: 'receive',
          body: logBody ? this.redactBody(data) : '[HIDDEN]',
        });
      }
    });

    stream.on('error', (error) => {
      this.log('error', `gRPC Stream Error: ${method}`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    stream.on('end', () => {
      this.log('info', `gRPC Stream Ended: ${method}`, { requestId });
    });

    return stream;
  };

  clientStreaming: import('../types/interceptor').ClientStreamingInterceptor = <
    Req,
    Res
  >(
    method: import('../types/branding').MethodPath,
    options: Readonly<GrpcCallOptions>,
    next: import('../types/interceptor').NextClientStreamingFn
  ): import('../types/stream').ClientStream<Req, Res> => {
    // 1. Sampling Check
    if (Math.random() > this.options.sampleRate) {
      return next(method, options);
    }

    const requestId = Math.random().toString(36).substring(7);

    this.log('info', `gRPC Client Stream Started: ${method}`, {
      requestId,
      type: 'client-streaming',
    });

    const stream = next<Req, Res>(method, options);
    // TODO: Monkey patch write() to log sent messages if needed.
    // For now, we only log stream lifecycle and response.

    return stream;
  };

  bidiStreaming: import('../types/interceptor').BidiStreamingInterceptor = <
    Req,
    Res
  >(
    method: import('../types/branding').MethodPath,
    options: Readonly<GrpcCallOptions>,
    next: import('../types/interceptor').NextBidiStreamingFn
  ): import('../types/stream').BidiStream<Req, Res> => {
    // 1. Sampling Check
    if (Math.random() > this.options.sampleRate) {
      return next(method, options);
    }

    const { logBody } = this.options;
    const requestId = Math.random().toString(36).substring(7);

    this.log('info', `gRPC Bidi Stream Started: ${method}`, {
      requestId,
      type: 'bidi-streaming',
    });

    const stream = next<Req, Res>(method, options);

    stream.on('data', (data) => {
      if (this.shouldLog('debug')) {
        this.log('debug', `gRPC Stream Data: ${method}`, {
          requestId,
          direction: 'receive',
          body: logBody ? this.redactBody(data) : '[HIDDEN]',
        });
      }
    });

    stream.on('error', (error) => {
      this.log('error', `gRPC Stream Error: ${method}`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return stream;
  };

  private shouldLog(targetLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];
    return levels.indexOf(targetLevel) >= levels.indexOf(this.options.level);
  }

  private log(level: LogLevel, message: string, meta: Record<string, unknown>) {
    switch (level) {
      case 'debug':
        this.logger.debug(message, meta);
        break;
      case 'info':
        this.logger.info(message, meta);
        break;
      case 'warn':
        this.logger.warn(message, meta);
        break;
      case 'error':
        this.logger.error(message, meta);
        break;
    }
  }

  private redactMetadata(metadata: GrpcMetadata): Record<string, string> {
    const result: Record<string, string> = { ...metadata.getMap() };
    for (const key of Object.keys(result)) {
      if (this.options.sensitiveHeaders.includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      }
    }
    return result;
  }

  private redactBody(body: unknown, depth = 0): unknown {
    if (!body || typeof body !== 'object' || depth > 5) return body;

    if (Array.isArray(body)) {
      return body.map((item) => this.redactBody(item, depth + 1));
    }

    const result: Record<string, unknown> = {};
    for (const key in body) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const value = (body as Record<string, unknown>)[key];

        // Check strict sensitive fields matches (e.g. "password", "user.email")
        // Simple case-insensitive key match for now
        if (this.isSensitiveField(key)) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = this.redactBody(value, depth + 1);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }

  private isSensitiveField(key: string): boolean {
    const lowerKey = key.toLowerCase();
    // Check against configured sensitive fields
    return this.options.sensitiveFields.some(
      (field) =>
        lowerKey === field.toLowerCase() ||
        lowerKey.endsWith(`.${field.toLowerCase()}`)
    );
  }
}
