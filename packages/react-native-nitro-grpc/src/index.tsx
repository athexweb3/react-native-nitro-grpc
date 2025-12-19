export { GrpcChannel } from './client/channel';
export { GrpcClient } from './client/client';
export type { GrpcCallOptions } from './types/call-options';

export {
  ChannelState,
  type ChannelOptions,
  type StatusObject,
} from './types/channel-types';
export {
  CallCredentials,
  ChannelCredentials,
  type GrpcCallCredentials,
  type GrpcChannelCredentials,
  type InsecureCredentials,
  type SslCredentials,
} from './types/credentials';
export { GrpcError } from './types/grpc-error';
export { GrpcStatus } from './types/grpc-status';
export { GrpcMetadata } from './types/metadata';

// Stream type exports
export type { BidiStream, ClientStream, ServerStream } from './types/stream';

// For backward compatibility (legacy API)
export type { Metadata, MetadataValue } from './types/metadata';

// Utility functions
export * from './streams';
export * from './utils/base64';
export * from './utils/gzip';
export * from './utils/sha256';
export * from './utils/uuid';

/**
 * Main entry point for react-native-nitro-grpc.
 *
 * @example
 * ```typescript
 * import {
 *   GrpcChannel,
 *   GrpcClient,
 *   ChannelCredentials,
 *   GrpcMetadata,
 * } from 'react-native-nitro-grpc';
 *
 * // Create a secure channel
 * const channel = new GrpcChannel(
 *   'api.example.com:443',
 *   ChannelCredentials.createSsl()
 * );
 *
 * // Create a client
 * const client = new GrpcClient(channel);
 *
 * // Make a unary call
 * const metadata = new GrpcMetadata();
 * metadata.add('authorization', 'Bearer token123');
 *
 * const response = await client.unaryCall(
 *   '/myservice.MyService/GetUser',
 *   { userId: '123' },
 *   { metadata, deadline: Date.now() + 5000 }
 * );
 * ```
 */
