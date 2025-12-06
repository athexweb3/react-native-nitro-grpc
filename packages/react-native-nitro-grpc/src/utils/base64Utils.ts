// Native C++ implementation via Nitro Modules
import { NitroModules } from 'react-native-nitro-modules';
import type { Base64 } from '../specs/Base64.nitro';

// Load the Hybrid Object
const HybridBase64 = NitroModules.createHybridObject<Base64>('Base64');

/**
 * Encodes Uint8Array to base64 string using native C++ implementation.
 *
 * @param data - Binary data to encode
 * @param urlSafe - Use URL-safe encoding (Not yet supported in native, falls back to standard)
 * @returns Base64 encoded string
 */
export function encodeBase64(data: Uint8Array, urlSafe = false): string {
  return HybridBase64.encode(data.buffer as ArrayBuffer, urlSafe);
}

/**
 * Decodes base64 string to Uint8Array using native C++ implementation.
 *
 * @param base64 - Base64 encoded string
 * @returns Decoded binary data
 */
export function decodeBase64(base64: string): Uint8Array {
  const buffer = HybridBase64.decode(base64);
  return new Uint8Array(buffer);
}

/**
 * Converts Uint8Array to UTF-8 string.
 */
export function uint8ArrayToString(data: Uint8Array): string {
  return new TextDecoder('utf-8').decode(data);
}

/**
 * Converts string to Uint8Array using UTF-8 encoding.
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Type guard to check if value is a Uint8Array.
 */
export function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}
