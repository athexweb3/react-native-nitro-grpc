import { NitroModules } from 'react-native-nitro-modules';
import type { Sha256 } from '../specs/Sha256.nitro';

const HybridSha256 = NitroModules.createHybridObject<Sha256>('Sha256');

/**
 * Computes the SHA256 hash of a string.
 * @param data The input string.
 * @returns The SHA256 hash as a hex string.
 */
export function sha256(data: string): string {
  return HybridSha256.hash(data);
}

/**
 * Computes the SHA256 hash of a byte array.
 * @param data The input buffer.
 * @returns The SHA256 hash as a hex string.
 */
export function sha256Bytes(data: Uint8Array): string {
  return HybridSha256.hashBytes(data.buffer as ArrayBuffer);
}
