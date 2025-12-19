import { GrpcMetadata } from './metadata';

/**
 * Connectivity state of a gRPC channel.
 */
export enum ChannelState {
  /**
   * Channel is idle (not trying to connect).
   */
  IDLE = 0,

  /**
   * Channel is attempting to connect.
   */
  CONNECTING = 1,

  /**
   * Channel is ready and can accept calls.
   */
  READY = 2,

  /**
   * Channel is experiencing a transient failure and will reconnect.
   */
  TRANSIENT_FAILURE = 3,

  /**
   * Channel has encountered a permanent failure and will not reconnect.
   */
  SHUTDOWN = 4,
}

/**
 * Status object returned when a gRPC call completes.
 * Contains the final status code, message, and trailing metadata.
 */
export interface StatusObject {
  /**
   * gRPC status code (see GrpcStatus enum).
   */
  code: number;

  /**
   * Human-readable status details.
   */
  details: string;

  /**
   * Trailing metadata sent by the server.
   */
  metadata: GrpcMetadata;
}

/**
 * Channel options for configuring the underlying gRPC channel.
 * These options match the arguments supported by @grpc/grpc-js.
 *
 * @see https://grpc.github.io/grpc/node/grpc.html#~ChannelOptions
 */
export interface ChannelOptions {
  /**
   * Override the target name used for SSL host name checking.
   */
  'grpc.ssl_target_name_override'?: string;

  /**
   * Primary user agent string.
   */
  'grpc.primary_user_agent'?: string;

  /**
   * Secondary user agent string.
   */
  'grpc.secondary_user_agent'?: string;

  /**
   * Default authority to use for calls.
   */
  'grpc.default_authority'?: string;

  /**
   * Keepalive time in milliseconds.
   * Send keepalive pings after this duration of inactivity.
   * Default: 2 hours (7200000ms)
   */
  'grpc.keepalive_time_ms'?: number;

  /**
   * Keepalive timeout in milliseconds.
   * Close connection if ping not acknowledged within this time.
   * Default: 20 seconds (20000ms)
   */
  'grpc.keepalive_timeout_ms'?: number;

  /**
   * Allow keepalive pings even when there are no active calls.
   * 0 = false, 1 = true
   */
  'grpc.keepalive_permit_without_calls'?: 0 | 1;

  /**
   * Service config in JSON format.
   */
  'grpc.service_config'?: string;

  /**
   * Maximum number of concurrent streams allowed on a connection.
   */
  'grpc.max_concurrent_streams'?: number;

  /**
   * Initial reconnection backoff in milliseconds.
   */
  'grpc.initial_reconnect_backoff_ms'?: number;

  /**
   * Maximum reconnection backoff in milliseconds.
   */
  'grpc.max_reconnect_backoff_ms'?: number;

  /**
   * Use a local subchannel pool (isolate channels).
   * 0 = false, 1 = true
   */
  'grpc.use_local_subchannel_pool'?: 0 | 1;

  /**
   * Maximum message size in bytes that can be sent.
   * Default: -1 (unlimited)
   */
  'grpc.max_send_message_length'?: number;

  /**
   * Maximum message size in bytes that can be received.
   * Default: 4 MB (4194304 bytes)
   */
  'grpc.max_receive_message_length'?: number;

  /**
   * Enable HTTP proxy support.
   * 0 = false (default), 1 = true
   */
  'grpc.enable_http_proxy'?: 0 | 1;

  /**
   * Default compression algorithm.
   * 0 = none, 1 = deflate, 2 = gzip
   */
  'grpc.default_compression_algorithm'?: 0 | 1 | 2;

  /**
   * Enable channelz for debugging.
   * 0 = false (default), 1 = true
   */
  'grpc.enable_channelz'?: 0 | 1;

  /**
   * Minimum time between DNS resolutions in milliseconds.
   */
  'grpc.dns_min_time_between_resolutions_ms'?: number;

  /**
   * Enable automatic retries.
   * 0 = false, 1 = true (default)
   */
  'grpc.enable_retries'?: 0 | 1;

  /**
   * Maximum connection age in milliseconds.
   */
  'grpc.max_connection_age_ms'?: number;

  /**
   * Maximum connection age grace period in milliseconds.
   */
  'grpc.max_connection_age_grace_ms'?: number;

  /**
   * Maximum connection idle time in milliseconds.
   */
  'grpc.max_connection_idle_ms'?: number;

  /**
   * Per-RPC retry buffer size in bytes.
   */
  'grpc.per_rpc_retry_buffer_size'?: number;

  /**
   * Total retry buffer size in bytes.
   */
  'grpc.retry_buffer_size'?: number;

  /**
   * Disable service config resolution.
   * 0 = false (default), 1 = true
   */
  'grpc.service_config_disable_resolution'?: 0 | 1;

  /**
   * Client idle timeout in milliseconds.
   */
  'grpc.client_idle_timeout_ms'?: number;

  /**
   * Maximum session memory for HTTP/2 in bytes.
   * Node.js specific option.
   */
  'grpc-node.max_session_memory'?: number;

  /**
   * Enable TLS tracing for debugging.
   * Node.js specific option.
   */
  'grpc-node.tls_enable_trace'?: boolean;

  /**
   * Maximum retry attempts limit.
   * Node.js specific option.
   */
  'grpc-node.retry_max_attempts_limit'?: number;

  /**
   * HTTP/2 flow control window size.
   * Node.js specific option.
   */
  'grpc-node.flow_control_window'?: number;

  /**
   * Override the channel implementation.
   * Advanced: Custom channel class constructor.
   */
  'channelOverride'?: unknown;

  /**
   * Override the channel factory.
   * Advanced: Custom channel factory function.
   */
  'channelFactoryOverride'?: unknown;

  /**
   * Service configuration object.
   * Will be serialized to JSON and passed as 'grpc.service_config'.
   */
  serviceConfig?: Record<string, unknown>;
}
