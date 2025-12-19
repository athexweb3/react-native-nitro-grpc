import { NitroModules } from 'react-native-nitro-modules';
import type { GrpcClient as HybridGrpcClient } from '../specs/GrpcClient.nitro';
import type { GrpcCallOptions } from '../types/callOptions';
import type { BidiStream, ClientStream, ServerStream } from '../types/stream';
import type { GrpcChannel } from './channel';
import { unaryCall, unaryCallSync } from '../calls/unary';
import { serverStream, clientStream, bidiStream } from '../calls/streaming';
import type { MethodDefinition } from '../types/method';

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
  private _interceptors: import('../types/interceptor').GrpcInterceptor[] = [];

  /**
   * Creates a new gRPC client.
   *
   * @param channel - Optional GrpcChannel instance. If not provided, creates standalone client.
   * @param interceptors - Optional list of interceptors to apply to each call.
   */
  constructor(
    channel?: GrpcChannel,
    interceptors: import('../types/interceptor').GrpcInterceptor[] = []
  ) {
    if (channel) {
      this._channel = channel;
      this._hybrid = channel._getHybridClient();
    } else {
      // Standalone mode (legacy)
      this._hybrid =
        NitroModules.createHybridObject<HybridGrpcClient>('GrpcClient');
    }
    this._interceptors = interceptors;
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
    method: string | MethodDefinition<Req, Res>,
    request: Req,
    options?: GrpcCallOptions
  ): Promise<Res> {
    return unaryCall(
      this._hybrid,
      method,
      request,
      options,
      this._interceptors
    );
  }

  /**
   * Makes a synchronous unary call.
   *
   * @param method - Full method name
   * @param request - Request message
   * @param options - Optional call configuration
   * @returns Response message
   */
  public unaryCallSync<Req, Res>(
    method: string | MethodDefinition<Req, Res>,
    request: Req,
    options?: GrpcCallOptions
  ): Res {
    return unaryCallSync(this._hybrid, method, request, options);
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
    return serverStream(this._hybrid, method, request, options);
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
    return clientStream(this._hybrid, method, options);
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
    return bidiStream(this._hybrid, method, options);
  }
}
