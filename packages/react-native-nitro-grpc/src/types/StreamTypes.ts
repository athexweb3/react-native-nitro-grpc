import { EventEmitter } from 'eventemitter3';
import type { GrpcMetadata } from '../types/GrpcMetadata';
import type { StatusObject } from '../types/ChannelTypes';
import type { GrpcError } from '../types/GrpcError';

/**
 * Base class for all gRPC streams.
 * Provides common event handling and lifecycle management.
 *
 * Events:
 * - 'metadata': Emitted when initial metadata is received from the server
 * - 'status': Emitted when the call completes (success or error)
 * - 'error': Emitted when an error occurs
 */
export abstract class GrpcStreamBase extends EventEmitter {
  protected _cancelled: boolean = false;

  /**
   * Listens for initial metadata from the server.
   * Metadata is received before any response messages.
   *
   * @param event - Event name
   * @param listener - Callback function
   */
  on(event: 'metadata', listener: (metadata: GrpcMetadata) => void): this;

  /**
   * Listens for the final status when the call completes.
   *
   * @param event - Event name
   * @param listener - Callback function
   */
  on(event: 'status', listener: (status: StatusObject) => void): this;

  /**
   * Listens for errors during the call.
   *
   * @param event - Event name
   * @param listener - Callback function
   */
  on(event: 'error', listener: (error: GrpcError) => void): this;

  // Catch-all for EventEmitter compatibility
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  /**
   * Cancels the call.
   * Emits an error event with CANCELLED status.
   */
  abstract cancel(): void;

  /**
   * Gets the peer address (server endpoint).
   *
   * @returns Server address string (e.g., "192.168.1.1:50051")
   */
  abstract getPeer(): string;

  /**
   * Checks if the stream has been cancelled.
   *
   * @returns True if cancelled
   */
  isCancelled(): boolean {
    return this._cancelled;
  }
}

/**
 * Server streaming call (read-only).
 * Client sends one request, server sends multiple responses.
 *
 * @example
 * ```typescript
 * const stream = client.serverStream('/service/method', request);
 * stream.on('data', (response) => console.log(response));
 * stream.on('end', () => console.log('Stream ended'));
 * stream.on('error', (err) => console.error(err));
 * ```
 */
export abstract class ServerStream<T> extends GrpcStreamBase {
  /**
   * Listens for response messages from the server.
   *
   * @param event - Event name
   * @param listener - Callback receiving the response data
   */
  on(event: 'data', listener: (data: T) => void): this;

  /**
   * Listens for the end of the stream (all data received).
   *
   * @param event - Event name
   * @param listener - Callback function
   */
  on(event: 'end', listener: () => void): this;

  on(event: 'metadata', listener: (metadata: GrpcMetadata) => void): this;
  on(event: 'status', listener: (status: StatusObject) => void): this;
  on(event: 'error', listener: (error: GrpcError) => void): this;

  // Catch-all for EventEmitter
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event as any, listener);
  }
}

/**
 * Client streaming call (write-only with promise response).
 * Client sends multiple requests, server sends one response.
 *
 * @example
 * ```typescript
 * const stream = client.clientStream('/service/method');
 * stream.write(request1);
 * stream.write(request2);
 * stream.end();
 *
 * const response = await stream.getResponse();
 * ```
 */
export abstract class ClientStream<Req, Res> extends GrpcStreamBase {
  /**
   * Writes a request message to the server.
   *
   * @param data - Request message to send
   * @returns True if write buffer is not full, false otherwise
   */
  abstract write(data: Req): boolean;

  /**
   * Signals that no more messages will be written.
   * The server will send its final response after receiving this.
   */
  abstract end(): void;

  /**
   * Gets a promise that resolves to the server's final response.
   *
   * @returns Promise resolving to the response
   */
  abstract getResponse(): Promise<Res>;
}

/**
 * Bidirectional streaming call (read and write).
 * Client and server can send multiple messages in both directions.
 *
 * @example
 * ```typescript
 * const stream = client.bidiStream('/service/method');
 *
 * stream.on('data', (response) => console.log('Received:', response));
 * stream.on('end', () => console.log('Server closed stream'));
 *
 * stream.write(request1);
 * stream.write(request2);
 * stream.end();
 * ```
 */
export abstract class BidiStream<Req, Res> extends GrpcStreamBase {
  /**
   * Listens for response messages from the server.
   *
   * @param event - Event name
   * @param listener - Callback receiving the response data
   */
  on(event: 'data', listener: (data: Res) => void): this;

  /**
   * Listens for the end of the stream from the server.
   *
   * @param event - Event name
   * @param listener - Callback function
   */
  on(event: 'end', listener: () => void): this;

  on(event: 'metadata', listener: (metadata: GrpcMetadata) => void): this;
  on(event: 'status', listener: (status: StatusObject) => void): this;
  on(event: 'error', listener: (error: GrpcError) => void): this;

  // Catch-all for EventEmitter
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event as any, listener);
  }
  /**
   * Writes a request message to the server.
   *
   * @param data - Request message to send
   * @returns True if write buffer is not full, false otherwise
   */
  abstract write(data: Req): boolean;

  /**
   * Signals that no more messages will be written from the client.
   * The server may continue sending messages.
   */
  abstract end(): void;
}
