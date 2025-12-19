import type { GrpcClient as HybridGrpcClient } from '../specs/GrpcClient.nitro';
import type { GrpcCallOptions } from '../types/call-options';
import { GrpcMetadata } from '../types/metadata';
import { serializeMessage } from '../utils/serialization';
import { toAbsoluteDeadline } from '../utils/deadline';
import { ServerStreamImpl, ClientStreamImpl, BidiStreamImpl } from '../streams';
import { ServerStream, ClientStream, BidiStream } from '../types/stream';

/**
 * Creates a server streaming call (single request, multiple responses).
 */
export function serverStream<Req, Res>(
  hybrid: HybridGrpcClient,
  method: string,
  request: Req,
  options?: GrpcCallOptions
): ServerStream<Res> {
  const requestBuffer = serializeMessage(request);
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadline(options?.deadline);

  const hybridStream = hybrid.createServerStream(
    method,
    requestBuffer,
    metadataJson,
    deadlineMs
  );

  return new ServerStreamImpl<Res>(hybridStream);
}

/**
 * Creates a client streaming call (multiple requests, single response).
 */
export function clientStream<Req, Res>(
  hybrid: HybridGrpcClient,
  method: string,
  options?: GrpcCallOptions
): ClientStream<Req, Res> {
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadline(options?.deadline);

  const hybridStream = hybrid.createClientStream(
    method,
    metadataJson,
    deadlineMs
  );

  return new ClientStreamImpl<Req, Res>(hybridStream);
}

/**
 * Creates a bidirectional streaming call (multiple requests and responses).
 */
export function bidiStream<Req, Res>(
  hybrid: HybridGrpcClient,
  method: string,
  options?: GrpcCallOptions
): BidiStream<Req, Res> {
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadline(options?.deadline);

  const hybridStream = hybrid.createBidiStream(
    method,
    metadataJson,
    deadlineMs
  );

  return new BidiStreamImpl<Req, Res>(hybridStream);
}

// Synchronous (blocking) stream creation functions

import {
  SyncServerStreamImpl,
  SyncClientStreamImpl,
  SyncBidiStreamImpl,
} from '../streams';
import { deserializeMessage } from '../utils/serialization';

/**
 * Creates a synchronous server streaming call (blocking iteration).
 */
export function serverStreamSync<Req, Res>(
  hybrid: HybridGrpcClient,
  method: string,
  request: Req,
  options?: GrpcCallOptions
): SyncServerStreamImpl<Res> {
  const requestBuffer = serializeMessage(request);
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadline(options?.deadline);

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
  method: string,
  options?: GrpcCallOptions
): SyncClientStreamImpl<Req, Res> {
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadline(options?.deadline);

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
  method: string,
  options?: GrpcCallOptions
): SyncBidiStreamImpl<Req, Res> {
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadline(options?.deadline);

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
