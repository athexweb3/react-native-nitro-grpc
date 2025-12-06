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
}
