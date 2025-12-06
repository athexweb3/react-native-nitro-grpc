import type { HybridObject } from 'react-native-nitro-modules';

export interface Gzip extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  /**
   * Compresses data using Gzip.
   * @param data The input data to compress.
   * @returns The compressed data as ArrayBuffer.
   */
  gzip(data: ArrayBuffer): ArrayBuffer;

  /**
   * Decompresses Gzip-compressed data.
   * @param data The input compressed data.
   * @returns The decompressed data as ArrayBuffer.
   */
  ungzip(data: ArrayBuffer): ArrayBuffer;
}
