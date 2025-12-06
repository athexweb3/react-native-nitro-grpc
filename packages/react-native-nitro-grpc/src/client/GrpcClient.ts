import { NitroModules } from 'react-native-nitro-modules';
import type { GrpcClient as HybridGrpcClient } from '../specs/GrpcClient.nitro';
import type { GrpcCallOptions } from './GrpcCallOptions';
import type { GrpcChannel } from './GrpcChannel';
import { GrpcMetadata } from '../types/GrpcMetadata';
import { GrpcError } from '../types/GrpcError';
import { GrpcStatus } from '../types/GrpcStatus';
import {
  ServerStreamImpl,
  ClientStreamImpl,
  BidiStreamImpl,
} from '../stream/StreamImplementations';
import type {
  ServerStream,
  ClientStream,
  BidiStream,
} from '../types/StreamTypes';

/**
 * gRPC client for making calls to a server.
 * Supports all gRPC call patterns: unary, server streaming, client streaming, and bidirectional streaming.
 *
 * @example
 * ```typescript
 * import { GrpcChannel, GrpcClient, ChannelCredentials } from 'react-native-nitro-grpc';
 *
 * const channel = new GrpcChannel(
 *   'localhost:50051',
 *   ChannelCredentials.createInsecure()
 * );
 *
 * const client = new GrpcClient(channel);
 *
 * // Unary call
 * const response = await client.unaryCall<Request, Response>(
 *   '/myservice.MyService/MyMethod',
 *   request
 * );
 *
 * // Server streaming
 * const stream = client.serverStream<Request, Response>(
 *   '/myservice.MyService/StreamMethod',
 *   request
 * );
 * stream.on('data', (response) => console.log(response));
 * ```
 */
export class GrpcClient {
  private _hybrid: HybridGrpcClient;
  private _channel?: GrpcChannel;

  /**
   * Creates a new gRPC client.
   *
   * @param channel - Optional GrpcChannel instance. If not provided, creates standalone client.
   */
  constructor(channel?: GrpcChannel) {
    if (channel) {
      this._channel = channel;
      this._hybrid = channel._getHybridClient();
    } else {
      // Standalone mode (legacy)
      this._hybrid =
        NitroModules.createHybridObject<HybridGrpcClient>('GrpcClient');
    }
  }

  /**
   * Connects to a gRPC server (legacy method for standalone mode).
   * Prefer using GrpcChannel constructor instead.
   *
   * @deprecated Use GrpcChannel instead
   * @param host - Server address
   * @param isInsecure - Whether to use insecure connection
   */
  public connect(host: string, isInsecure: boolean): void {
    if (this._channel) {
      throw new Error(
        'Cannot call connect() on a client created from a channel. Channel is already connected.'
      );
    }
    this._hybrid.connect(host, isInsecure ? 'insecure' : 'ssl', '{}');
  }

  /**
   * Makes a unary call (single request, single response).
   *
   * @param method - Full method name (e.g., "/package.Service/Method")
   * @param request - Request message (Uint8Array or serializable object)
   * @param options - Optional call configuration
   * @returns Promise resolving to the response message
   *
   * @example
   * ```typescript
   * const response = await client.unaryCall<MyRequest, MyResponse>(
   *   '/myservice.MyService/GetUser',
   *   { userId: 123 },
   *   { deadline: Date.now() + 5000 }
   * );
   * ```
   */
  public async unaryCall<Req, Res>(
    method: string,
    request: Req,
    options?: GrpcCallOptions
  ): Promise<Res> {
    try {
      // Serialize request to ArrayBuffer
      const requestBuffer = this._serializeMessage(request);

      // Prepare metadata and deadline
      const metadata = options?.metadata || new GrpcMetadata();
      const metadataJson = JSON.stringify(metadata.toJSON());
      const deadlineMs = this._calculateDeadline(options?.deadline);

      // Handle AbortSignal
      if (options?.signal) {
        this._checkAborted(options.signal);
        // TODO: Implement cancellation when signal aborts
      }

      // Make the call
      const responseBuffer = await this._hybrid.unaryCall(
        method,
        requestBuffer,
        metadataJson,
        deadlineMs
      );

      // Deserialize response
      return this._deserializeMessage<Res>(responseBuffer);
    } catch (error) {
      throw this._wrapError(error);
    }
  }

  /**
   * Creates a server streaming call (single request, multiple responses).
   *
   * @param method - Full method name
   * @param request - Request message
   * @param options - Optional call configuration
   * @returns ServerStream for receiving responses
   *
   * @example
   * ```typescript
   * const stream = client.serverStream<Query, Result>(
   *   '/myservice.MyService/Search',
   *   { query: 'hello' }
   * );
   *
   * stream.on('data', (result) => console.log('Got result:', result));
   * stream.on('end', () => console.log('Stream ended'));
   * stream.on('error', (err) => console.error('Error:', err));
   * ```
   */
  public serverStream<Req, Res>(
    method: string,
    request: Req,
    options?: GrpcCallOptions
  ): ServerStream<Res> {
    const requestBuffer = this._serializeMessage(request);
    const metadata = options?.metadata || new GrpcMetadata();
    const metadataJson = JSON.stringify(metadata.toJSON());
    const deadlineMs = this._calculateDeadline(options?.deadline);

    const hybridStream = this._hybrid.createServerStream(
      method,
      requestBuffer,
      metadataJson,
      deadlineMs
    );

    return new ServerStreamImpl<Res>(hybridStream, this);
  }

  /**
   * Creates a client streaming call (multiple requests, single response).
   *
   * @param method - Full method name
   * @param options - Optional call configuration
   * @returns ClientStream for sending requests
   *
   * @example
   * ```typescript
   * const stream = client.clientStream<Item, Summary>(
   *   '/myservice.MyService/UploadItems'
   * );
   *
   * stream.write({ id: 1, name: 'Item 1' });
   * stream.write({ id: 2, name: 'Item 2' });
   * stream.end();
   *
   * const summary = await stream.getResponse();
   * console.log('Upload complete:', summary);
   * ```
   */
  public clientStream<Req, Res>(
    method: string,
    options?: GrpcCallOptions
  ): ClientStream<Req, Res> {
    const metadata = options?.metadata || new GrpcMetadata();
    const metadataJson = JSON.stringify(metadata.toJSON());
    const deadlineMs = this._calculateDeadline(options?.deadline);

    const hybridStream = this._hybrid.createClientStream(
      method,
      metadataJson,
      deadlineMs
    );

    return new ClientStreamImpl<Req, Res>(hybridStream, this);
  }

  /**
   * Creates a bidirectional streaming call (multiple requests and responses).
   *
   * @param method - Full method name
   * @param options - Optional call configuration
   * @returns BidiStream for sending and receiving messages
   *
   * @example
   * ```typescript
   * const stream = client.bidiStream<Message, Message>(
   *   '/myservice.MyService/Chat'
   * );
   *
   * stream.on('data', (msg) => console.log('Received:', msg));
   * stream.on('end', () => console.log('Server closed stream'));
   *
   * stream.write({ text: 'Hello' });
   * stream.write({ text: 'World' });
   * stream.end();
   * ```
   */
  public bidiStream<Req, Res>(
    method: string,
    options?: GrpcCallOptions
  ): BidiStream<Req, Res> {
    const metadata = options?.metadata || new GrpcMetadata();
    const metadataJson = JSON.stringify(metadata.toJSON());
    const deadlineMs = this._calculateDeadline(options?.deadline);

    const hybridStream = this._hybrid.createBidiStream(
      method,
      metadataJson,
      deadlineMs
    );

    return new BidiStreamImpl<Req, Res>(hybridStream, this);
  }

  // ==================== Internal Helper Methods ====================

  /**
   * Serializes a message to ArrayBuffer.
   * @internal
   */
  _serializeMessage<T>(message: T): ArrayBuffer {
    // TODO: Implement proper protobuf serialization
    // For now, use JSON as placeholder
    if (message instanceof Uint8Array) {
      return message.buffer as ArrayBuffer;
    }
    const json = JSON.stringify(message);
    const encoder = new TextEncoder();
    return encoder.encode(json).buffer as ArrayBuffer;
  }

  /**
   * Deserializes a message from ArrayBuffer.
   * @internal
   */
  _deserializeMessage<T>(buffer: ArrayBuffer): T {
    // TODO: Implement proper protobuf deserialization
    // For now, use JSON as placeholder
    const decoder = new TextDecoder();
    const json = decoder.decode(buffer);
    return JSON.parse(json) as T;
  }

  /**
   * Calculates deadline in milliseconds from options.
   * @internal
   */
  private _calculateDeadline(deadline?: Date | number): number {
    if (!deadline) {
      return 0; // No deadline
    }
    if (typeof deadline === 'number') {
      return Date.now() + deadline;
    }
    return deadline.getTime();
  }

  /**
   * Checks if an AbortSignal has been aborted.
   * @internal
   */
  private _checkAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new GrpcError(
        GrpcStatus.CANCELLED,
        'Call cancelled via AbortSignal'
      );
    }
  }

  /**
   * Wraps unknown errors into GrpcError.
   * @internal
   */
  private _wrapError(error: unknown): GrpcError {
    if (error instanceof GrpcError) {
      return error;
    }
    if (error instanceof Error) {
      return new GrpcError(GrpcStatus.UNKNOWN, error.message, undefined, error);
    }
    return new GrpcError(GrpcStatus.UNKNOWN, String(error));
  }
}
