import { type HybridObject } from 'react-native-nitro-modules';
import type { GrpcStream } from './GrpcStream.nitro';

export interface GrpcClient
  extends HybridObject<{
    ios: 'c++';
    android: 'c++';
  }> {
  /**
   * Connects to a gRPC server.
   * @param target The server host URL (e.g. "localhost:50051")
   * @param credentialsJson JSON-serialized credentials
   * @param optionsJson JSON-serialized channel options
   */
  connect(target: string, credentialsJson: string, optionsJson: string): void;

  /**
   * Closes the channel and releases resources.
   */
  close(): void;

  /**
   * Makes a unary call.
   * @param method The method name (e.g. "/MyService/MyMethod")
   * @param request The serialized request message
   * @param metadataJson JSON-serialized metadata
   * @param deadlineMs Deadline in milliseconds (0 = no deadline)
   * @returns A promise that resolves to the serialized response message
   */
  unaryCall(
    method: string,
    request: ArrayBuffer,
    metadataJson: string,
    deadlineMs: number
  ): Promise<ArrayBuffer>;

  /**
   * Creates a server streaming call.
   * @param method The method name
   * @param request The serialized request message
   * @param metadataJson JSON-serialized metadata
   * @param deadlineMs Deadline in milliseconds
   * @returns A stream for receiving responses
   */
  createServerStream(
    method: string,
    request: ArrayBuffer,
    metadataJson: string,
    deadlineMs: number
  ): GrpcStream;

  /**
   * Creates a client streaming call.
   * @param method The method name
   * @param metadataJson JSON-serialized metadata
   * @param deadlineMs Deadline in milliseconds
   * @returns A stream for sending requests
   */
  createClientStream(
    method: string,
    metadataJson: string,
    deadlineMs: number
  ): GrpcStream;

  /**
   * Creates a bidirectional streaming call.
   * @param method The method name
   * @param metadataJson JSON-serialized metadata
   * @param deadlineMs Deadline in milliseconds
   * @returns A stream for sending and receiving messages
   */
  createBidiStream(
    method: string,
    metadataJson: string,
    deadlineMs: number
  ): GrpcStream;
}
