import type { GrpcClient as HybridGrpcClient } from '../specs/GrpcClient.nitro';
import type { GrpcCallOptions } from '../types/call-options';
import { GrpcMetadata } from '../types/metadata';
import { serializeMessage } from '../utils/serialization';
import { toAbsoluteDeadline } from '../utils/deadline';
import { ServerStreamImpl, ClientStreamImpl, BidiStreamImpl } from '../streams';
import { ServerStream, ClientStream, BidiStream } from '../types/stream';
import type {
  GrpcInterceptor,
  NextServerStreamingFn,
  NextClientStreamingFn,
  NextBidiStreamingFn,
  ServerStreamingInterceptor,
  ClientStreamingInterceptor,
  BidiStreamingInterceptor,
} from '../interceptor';
import type { MethodPath } from '../types/branding';

/**
 * Creates a server streaming call (single request, multiple responses).
 */
export function serverStream<Req, Res>(
  hybrid: HybridGrpcClient,
  method: MethodPath,
  request: Req,
  options: Readonly<GrpcCallOptions> | undefined,
  interceptors: GrpcInterceptor[]
): ServerStream<Res> {
  return applyServerStreamingInterceptors(
    interceptors,
    method,
    request,
    options,
    (m, r, o) => {
      const requestBuffer = serializeMessage(r);
      const metadata = o?.metadata || new GrpcMetadata();
      const metadataJson = JSON.stringify(metadata.toJSON());
      const deadlineMs = toAbsoluteDeadline(o?.deadline);

      const hybridStream = hybrid.createServerStream(
        m,
        requestBuffer,
        metadataJson,
        deadlineMs
      );

      return new ServerStreamImpl<Res>(hybridStream);
    }
  );
}

/**
 * Creates a client streaming call (multiple requests, single response).
 */
export function clientStream<Req, Res>(
  hybrid: HybridGrpcClient,
  method: MethodPath,
  options: Readonly<GrpcCallOptions> | undefined,
  interceptors: GrpcInterceptor[]
): ClientStream<Req, Res> {
  return applyClientStreamingInterceptors(
    interceptors,
    method,
    options,
    (m, o) => {
      const metadata = o?.metadata || new GrpcMetadata();
      const metadataJson = JSON.stringify(metadata.toJSON());
      const deadlineMs = toAbsoluteDeadline(o?.deadline);

      const hybridStream = hybrid.createClientStream(
        m,
        metadataJson,
        deadlineMs
      );

      return new ClientStreamImpl<Req, Res>(hybridStream);
    }
  );
}

/**
 * Creates a bidirectional streaming call (multiple requests and responses).
 */
export function bidiStream<Req, Res>(
  hybrid: HybridGrpcClient,
  method: MethodPath,
  options: Readonly<GrpcCallOptions> | undefined,
  interceptors: GrpcInterceptor[]
): BidiStream<Req, Res> {
  return applyBidiStreamingInterceptors(
    interceptors,
    method,
    options,
    (m, o) => {
      const metadata = o?.metadata || new GrpcMetadata();
      const metadataJson = JSON.stringify(metadata.toJSON());
      const deadlineMs = toAbsoluteDeadline(o?.deadline);

      const hybridStream = hybrid.createBidiStream(m, metadataJson, deadlineMs);

      return new BidiStreamImpl<Req, Res>(hybridStream);
    }
  );
}

// Helper Functions for Interceptor Application

function applyServerStreamingInterceptors<Req, Res>(
  interceptors: GrpcInterceptor[],
  method: MethodPath,
  request: Req,
  options: Readonly<GrpcCallOptions> | undefined,
  finalCall: (
    m: MethodPath,
    r: Req,
    o: Readonly<GrpcCallOptions>
  ) => ServerStream<Res>
): ServerStream<Res> {
  const streamInterceptors = interceptors
    .map((i) => i.serverStreaming)
    .filter((i): i is ServerStreamingInterceptor => i !== undefined);

  let index = 0;
  const next: NextServerStreamingFn = <R, S>(
    m: MethodPath,
    r: R,
    o: Readonly<GrpcCallOptions>
  ): ServerStream<S> => {
    if (index >= streamInterceptors.length) {
      // Reached the end of the chain.
      // We assume strict type preservation. R should be Req, S should be Res.
      return finalCall(m, r as unknown as Req, o) as unknown as ServerStream<S>;
    }
    const interceptor = streamInterceptors[index++];
    return interceptor!(m, r, o, next);
  };

  return next(method, request, options || {});
}

function applyClientStreamingInterceptors<Req, Res>(
  interceptors: GrpcInterceptor[],
  method: MethodPath,
  options: Readonly<GrpcCallOptions> | undefined,
  finalCall: (
    m: MethodPath,
    o: Readonly<GrpcCallOptions>
  ) => ClientStream<Req, Res>
): ClientStream<Req, Res> {
  const streamInterceptors = interceptors
    .map((i) => i.clientStreaming)
    .filter((i): i is ClientStreamingInterceptor => i !== undefined);

  let index = 0;
  const next: NextClientStreamingFn = <R, S>(
    m: MethodPath,
    o: Readonly<GrpcCallOptions>
  ): ClientStream<R, S> => {
    if (index >= streamInterceptors.length) {
      return finalCall(m, o) as unknown as ClientStream<R, S>;
    }
    const interceptor = streamInterceptors[index++];
    return interceptor!(m, o, next);
  };

  return next(method, options || {});
}

function applyBidiStreamingInterceptors<Req, Res>(
  interceptors: GrpcInterceptor[],
  method: MethodPath,
  options: Readonly<GrpcCallOptions> | undefined,
  finalCall: (
    m: MethodPath,
    o: Readonly<GrpcCallOptions>
  ) => BidiStream<Req, Res>
): BidiStream<Req, Res> {
  const streamInterceptors = interceptors
    .map((i) => i.bidiStreaming)
    .filter((i): i is BidiStreamingInterceptor => i !== undefined);

  let index = 0;
  const next: NextBidiStreamingFn = <R, S>(
    m: MethodPath,
    o: Readonly<GrpcCallOptions>
  ): BidiStream<R, S> => {
    if (index >= streamInterceptors.length) {
      return finalCall(m, o) as unknown as BidiStream<R, S>;
    }
    const interceptor = streamInterceptors[index++];
    return interceptor!(m, o, next);
  };

  return next(method, options || {});
}

// Synchronous (blocking) stream creation functions

import {
  SyncServerStreamImpl,
  SyncClientStreamImpl,
  SyncBidiStreamImpl,
} from '../streams';
import { deserializeMessage } from '../utils/serialization';
import { toAbsoluteDeadline as toAbsoluteDeadlineSync } from '../utils/deadline'; // Import again or reuse

/**
 * Creates a synchronous server streaming call (blocking iteration).
 */
export function serverStreamSync<Req, Res>(
  hybrid: HybridGrpcClient,
  method: MethodPath,
  request: Req,
  options?: Readonly<GrpcCallOptions>
): SyncServerStreamImpl<Res> {
  const requestBuffer = serializeMessage(request);
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadlineSync(options?.deadline);

  const hybridStream = hybrid.createServerStreamSync(
    method,
    requestBuffer,
    metadataJson,
    deadlineMs
  );

  return new SyncServerStreamImpl<Res>(hybridStream, deserializeMessage);
}

/**
 * Creates a synchronous client streaming call (blocking writes/finish).
 */
export function clientStreamSync<Req, Res>(
  hybrid: HybridGrpcClient,
  method: MethodPath,
  options?: Readonly<GrpcCallOptions>
): SyncClientStreamImpl<Req, Res> {
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadlineSync(options?.deadline);

  const hybridStream = hybrid.createClientStreamSync(
    method,
    metadataJson,
    deadlineMs
  );

  return new SyncClientStreamImpl<Req, Res>(
    hybridStream,
    serializeMessage,
    deserializeMessage
  );
}

/**
 * Creates a synchronous bidirectional streaming call (blocking reads/writes).
 */
export function bidiStreamSync<Req, Res>(
  hybrid: HybridGrpcClient,
  method: MethodPath,
  options?: Readonly<GrpcCallOptions>
): SyncBidiStreamImpl<Req, Res> {
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadlineSync(options?.deadline);

  const hybridStream = hybrid.createBidiStreamSync(
    method,
    metadataJson,
    deadlineMs
  );

  return new SyncBidiStreamImpl<Req, Res>(
    hybridStream,
    serializeMessage,
    deserializeMessage
  );
}
