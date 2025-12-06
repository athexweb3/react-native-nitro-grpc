import type { HybridObject } from 'react-native-nitro-modules';

export interface Sha256 extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  /**
   * Computes the SHA256 hash of a string.
   * @param data The input string to hash.
   * @returns The SHA256 hash as a hex string.
   */
  hash(data: string): string;

  /**
   * Computes the SHA256 hash of a byte array.
   * @param data The input buffer to hash.
   * @returns The SHA256 hash as a hex string.
   */
  hashBytes(data: ArrayBuffer): string;
}
