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
   * Gets the current connectivity state of the channel.
   * @param tryToConnect Whether to try to connect if idle
   * @returns The current state (enum value)
   */
  getConnectivityState(tryToConnect: boolean): number;

  /**
   * Watches for connectivity state changes.
   * Resolves when the state changes from `lastState`.
   * @param lastState The state to watch from
   * @param deadlineMs Deadline in milliseconds
   */
  watchConnectivityState(lastState: number, deadlineMs: number): Promise<void>;

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
    deadlineMs: number,
    callId: string
  ): Promise<ArrayBuffer>;

  /**
   * Cancels a specific call.
   * @param callId The unique ID of the call to cancel
   */
  cancelCall(callId: string): void;
  unaryCallSync(
    method: string,
    request: ArrayBuffer,
    metadata: string,
    deadline: number
  ): ArrayBuffer;

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

  // Synchronous (blocking) stream creation methods

  /**
   * Creates a synchronous server streaming call (blocking reads).
   * @param method The method name
   * @param request The serialized request message
   * @param metadataJson JSON-serialized metadata
   * @param deadlineMs Deadline in milliseconds
   * @returns A stream for receiving responses synchronously
   */
  createServerStreamSync(
    method: string,
    request: ArrayBuffer,
    metadataJson: string,
    deadlineMs: number
  ): GrpcStream;

  /**
   * Creates a synchronous client streaming call (blocking writes/finish).
   * @param method The method name
   * @param metadataJson JSON-serialized metadata
   * @param deadlineMs Deadline in milliseconds
   * @returns A stream for sending requests synchronously
   */
  createClientStreamSync(
    method: string,
    metadataJson: string,
    deadlineMs: number
  ): GrpcStream;

  /**
   * Creates a synchronous bidirectional streaming call (blocking reads/writes).
   * @param method The method name
   * @param metadataJson JSON-serialized metadata
   * @param deadlineMs Deadline in milliseconds
   * @returns A stream for sending and receiving messages synchronously
   */
  createBidiStreamSync(
    method: string,
    metadataJson: string,
    deadlineMs: number
  ): GrpcStream;
}
