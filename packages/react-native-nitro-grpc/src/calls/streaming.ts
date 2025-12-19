import type { GrpcClient as HybridGrpcClient } from '../specs/GrpcClient.nitro';
import type { GrpcCallOptions } from '../types/callOptions';
import { GrpcMetadata } from '../types/metadata';
import { serializeMessage } from '../utils/serialization';
import { toAbsoluteDeadline } from '../utils/deadline';
import { ServerStreamImpl, ClientStreamImpl, BidiStreamImpl } from '../stream';
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
