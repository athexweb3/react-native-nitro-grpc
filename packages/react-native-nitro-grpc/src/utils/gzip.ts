import { NitroModules } from 'react-native-nitro-modules';
import type { Gzip } from '../specs/Gzip.nitro';

const HybridGzip = NitroModules.createHybridObject<Gzip>('Gzip');

/**
 * Compresses data using Gzip.
 * @param data The input data to compress.
 * @returns The compressed data as Uint8Array.
 */
export function gzip(data: Uint8Array): Uint8Array {
  const buffer = HybridGzip.gzip(data.buffer as ArrayBuffer);
  return new Uint8Array(buffer);
}

/**
 * Decompresses Gzip-compressed data.
 * @param data The input compressed data.
 * @returns The decompressed data as Uint8Array.
 */
export function ungzip(data: Uint8Array): Uint8Array {
  const buffer = HybridGzip.ungzip(data.buffer as ArrayBuffer);
  return new Uint8Array(buffer);
}
