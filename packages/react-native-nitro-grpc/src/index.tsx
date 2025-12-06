// Core client and channel exports
export { GrpcClient } from './client/GrpcClient';
export { GrpcChannel } from './client/GrpcChannel';
export type { GrpcCallOptions } from './client/GrpcCallOptions';

// Type system exports
export { GrpcMetadata } from './types/GrpcMetadata';
export { GrpcError } from './types/GrpcError';
export { GrpcStatus } from './types/GrpcStatus';
export {
  ChannelCredentials,
  CallCredentials,
  type GrpcChannelCredentials,
  type GrpcCallCredentials,
  type InsecureCredentials,
  type SslCredentials,
} from './types/GrpcCredentials';
export {
  ChannelState,
  type StatusObject,
  type ChannelOptions,
} from './types/ChannelTypes';

// Stream type exports
export type {
  ServerStream,
  ClientStream,
  BidiStream,
} from './types/StreamTypes';

// For backward compatibility (legacy API)
export type { Metadata, MetadataValue } from './types/GrpcMetadata';

// Utility functions
export * from './utils';

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
