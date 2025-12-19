import { type HybridObject } from 'react-native-nitro-modules';

export interface GrpcStream
  extends HybridObject<{
    ios: 'c++';
    android: 'c++';
  }> {
  /**
   * Writes data to the stream.
   * @param data The serialized message to send
   */
  write(data: ArrayBuffer): void;

  /**
   * Signals that no more data will be written to the stream.
   */
  writesDone(): void;

  /**
   * Sets a callback to be called when data is received.
   * @param callback The callback function
   */
  onData(callback: (data: ArrayBuffer) => void): void;

  /**
   * Sets a callback to be called when metadata is received.
   * @param callback The callback function receiving JSON-serialized metadata
   */
  onMetadata(callback: (metadataJson: string) => void): void;

  /**
   * Sets a callback to be called when the stream completes with a status.
   * @param callback The callback function
   */
  onStatus(
    callback: (code: number, message: string, metadataJson: string) => void
  ): void;

  /**
   * Sets a callback to be called when an error occurs.
   * @param callback The callback function
   */
  onError(callback: (error: string) => void): void;

  /**
   * Cancels the stream.
   */
  cancel(): void;

  // Synchronous (blocking) API for sync streaming

  /**
   * Reads the next message from the stream synchronously (blocks until data available).
   * For server streaming and bidi streaming.
   * @returns The next message, or null if the stream has ended
   */
  readSync(): ArrayBuffer | null;

  /**
   * Writes data to the stream synchronously (blocks if buffer is full).
   * For client streaming and bidi streaming.
   * @param data The serialized message to send
   */
  writeSync(data: ArrayBuffer): void;

  /**
   * Finishes the stream and waits for final status synchronously (blocks).
   * For client streaming - writes done and waits for response.
   * @returns The response message for client streaming, or null for other types
   */
  finishSync(): ArrayBuffer | null;
}
