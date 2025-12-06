/**
 * High-performance Base64 encoding/decoding for React Native.
 * RFC 4648 compliant implementation.
 *
 * Based on ts-base64 by bindon
 * @see https://github.com/bindon/ts-base64
 *
 * Optimized for Uint8Array operations with no Node.js dependencies.
 */

const BASE64_MAP =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const PADDING_CHAR = 61; // '='

// Pre-computed encoding maps for standard (+/) and URL-safe (-_) variants
const encodingMapStandard = new Array<number>(64);
const encodingMapUrlSafe = new Array<number>(64);

// Pre-computed decoding map for all possible characters
const decodingMap = new Array<number>(123);
for (let i = 0; i < decodingMap.length; i++) {
  decodingMap[i] = 0;
}

// Initialize encoding/decoding maps
for (let idx = 0; idx < BASE64_MAP.length; idx++) {
  const code = BASE64_MAP.charCodeAt(idx);
  encodingMapStandard[idx] = code;
  encodingMapUrlSafe[idx] = code;
  decodingMap[code] = idx;
}

// Standard Base64: 62('+'), 63( '/')
encodingMapStandard[62] = 43; // '+'
encodingMapStandard[63] = 47; // '/'

// URL-safe Base64: 62('-'), 63('_')
encodingMapUrlSafe[62] = 45; // '-'
encodingMapUrlSafe[63] = 95; // '_'

// Decoding map for both variants
decodingMap[43] = 62; // '+'
decodingMap[45] = 62; // '-'
decodingMap[47] = 63; // '/'
decodingMap[95] = 63; // '_'

/**
 * Encodes Uint8Array to base64 string.
 * Uses native TextEncoder/TextDecoder for optimal React Native performance.
 *
 * @param data - Binary data to encode
 * @param urlSafe - Use URL-safe encoding (- and _ instead of + and /)
 * @returns Base64 encoded string
 */
export function encodeBase64(data: Uint8Array, urlSafe = false): string {
  const map = urlSafe ? encodingMapUrlSafe : encodingMapStandard;
  const len = data.length;
  const outputLen = Math.ceil((len * 4) / 3);
  const output = new Uint8Array(outputLen);

  let inputIdx = 0;
  let outputIdx = 0;

  // Process full 3-byte chunks
  while (inputIdx + 3 <= len) {
    const b0 = data[inputIdx] ?? 0;
    const b1 = data[inputIdx + 1] ?? 0;
    const b2 = data[inputIdx + 2] ?? 0;

    output[outputIdx] = map[b0 >> 2] ?? 0;
    output[outputIdx + 1] = map[((b0 << 4) | (b1 >> 4)) & 0x3f] ?? 0;
    output[outputIdx + 2] = map[((b1 << 2) | (b2 >> 6)) & 0x3f] ?? 0;
    output[outputIdx + 3] = map[b2 & 0x3f] ?? 0;

    inputIdx += 3;
    outputIdx += 4;
  }

  // Process remaining 1 or 2 bytes
  if (inputIdx < len) {
    const b0 = data[inputIdx] ?? 0;
    const b1 = data[inputIdx + 1] ?? 0;
    const b2 = data[inputIdx + 2] ?? 0;

    output[outputIdx++] = map[b0 >> 2] ?? 0;
    output[outputIdx++] = map[((b0 << 4) | (b1 >> 4)) & 0x3f] ?? 0;

    if (inputIdx + 1 < len) {
      output[outputIdx++] = map[((b1 << 2) | (b2 >> 6)) & 0x3f] ?? 0;
    }
    if (inputIdx + 2 < len) {
      output[outputIdx++] = map[b2 & 0x3f] ?? 0;
    }
  }

  return new TextDecoder('ascii').decode(output.subarray(0, outputIdx));
}

/**
 * Decodes base64 string to Uint8Array.
 * Handles both standard and URL-safe base64, with or without padding.
 *
 * @param base64 - Base64 encoded string
 * @returns Decoded binary data
 */
export function decodeBase64(base64: string): Uint8Array {
  const input = new TextEncoder().encode(base64);
  const inputLen = input.length;
  const expectedLen = Math.floor((inputLen * 3) / 4);
  const output = new Uint8Array(expectedLen);

  let inputIdx = 0;
  let outputIdx = 0;

  // Process full 4-character chunks
  while (inputIdx + 4 <= inputLen) {
    const c0 = decodingMap[input[inputIdx] ?? 0] ?? 0;
    const c1 = decodingMap[input[inputIdx + 1] ?? 0] ?? 0;
    const c2 = decodingMap[input[inputIdx + 2] ?? 0] ?? 0;
    const c3 = decodingMap[input[inputIdx + 3] ?? 0] ?? 0;

    output[outputIdx++] = (c0 << 2) | (c1 >> 4);
    output[outputIdx++] = (c1 << 4) | (c2 >> 2);
    output[outputIdx++] = (c2 << 6) | c3;

    inputIdx += 4;
  }

  // Process remaining characters
  if (inputIdx < inputLen) {
    const byte0 = input[inputIdx];
    const byte1 = input[inputIdx + 1];

    if (byte0 !== undefined && byte1 !== undefined) {
      const c0 = decodingMap[byte0] ?? 0;
      const c1 = decodingMap[byte1] ?? 0;
      output[outputIdx++] = (c0 << 2) | (c1 >> 4);

      const byte2 = input[inputIdx + 2];
      if (byte2 && byte2 !== PADDING_CHAR) {
        const c2 = decodingMap[byte2] ?? 0;
        output[outputIdx++] = (c1 << 4) | (c2 >> 2);

        const byte3 = input[inputIdx + 3];
        if (byte3 && byte3 !== PADDING_CHAR) {
          const c3 = decodingMap[byte3] ?? 0;
          output[outputIdx++] = (c2 << 6) | c3;
        }
      }
    }
  }

  return output.subarray(0, outputIdx);
}

/**
 * Converts Uint8Array to UTF-8 string.
 *
 * @param data - Binary data
 * @returns UTF-8 string
 */
export function uint8ArrayToString(data: Uint8Array): string {
  return new TextDecoder('utf-8').decode(data);
}

/**
 * Converts string to Uint8Array using UTF-8 encoding.
 *
 * @param str - String to convert
 * @returns Binary data
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Type guard to check if value is a Uint8Array.
 *
 * @param value - Value to check
 * @returns True if value is Uint8Array
 */
export function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}
