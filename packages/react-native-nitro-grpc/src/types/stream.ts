import { EventEmitter } from 'eventemitter3';
import type { StatusObject } from './channel-types';
import type { GrpcError } from './grpc-error';
import type { GrpcMetadata } from './metadata';

/**
 * Strict event map for base gRPC stream events.
 */
export interface GrpcStreamEvents {
  metadata: (metadata: GrpcMetadata) => void;
  status: (status: StatusObject) => void;
  error: (error: GrpcError) => void;
}

/**
 * Base class for all gRPC streams.
 * Provides common event handling and lifecycle management.
 */
export abstract class GrpcStreamBase<
  Events extends GrpcStreamEvents = GrpcStreamEvents
> extends EventEmitter<Events> {
  protected _cancelled: boolean = false;

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
 * Events specific to server streams (and bidi).
 */
export interface ServerStreamEvents<T> extends GrpcStreamEvents {
  data: (data: T) => void;
  end: () => void;
}

/**
 * Server streaming call (read-only).
 * Client sends one request, server sends multiple responses.
 */
export abstract class ServerStream<T> extends GrpcStreamBase<
  ServerStreamEvents<T>
> {
  /**
   * Pauses reading from the stream.
   * No 'data' events will be emitted until resume() is called.
   */
  abstract pause(): void;

  /**
   * Resumes reading from the stream.
   */
  abstract resume(): void;
}

/**
 * Client streams don't have 'data' events (they have a Promise response).
 * They inherit base events.
 */
export abstract class ClientStream<
  Req,
  Res
> extends GrpcStreamBase<GrpcStreamEvents> {
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
 * Bidirectional streams have 'data' events like server streams.
 */
export abstract class BidiStream<Req, Res> extends GrpcStreamBase<
  ServerStreamEvents<Res>
> {
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

  /**
   * Pauses reading from the stream.
   * No 'data' events will be emitted until resume() is called.
   */
  abstract pause(): void;

  /**
   * Resumes reading from the stream.
   */
  abstract resume(): void;
}
