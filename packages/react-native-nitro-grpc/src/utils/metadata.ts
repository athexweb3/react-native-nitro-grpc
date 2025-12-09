import { GrpcMetadata } from '../types/metadata';
import { isUint8Array, uint8ArrayToString } from './base64';

/**
 * Creates a new GrpcMetadata instance from a plain object.
 *
 * @param obj - Plain object with string keys and string/Uint8Array values
 * @returns New GrpcMetadata instance
 *
 * @example
 * ```typescript
 * const metadata = createMetadata({
 *   'authorization': 'Bearer token',
 *   'custom-bin': new Uint8Array([1, 2, 3])
 * });
 * ```
 */
export function createMetadata(
  obj: Record<string, string | Uint8Array>
): GrpcMetadata {
  const metadata = new GrpcMetadata();
  Object.entries(obj).forEach(([key, value]) => {
    metadata.add(key, value);
  });
  return metadata;
}

/**
 * Merges multiple metadata objects into one.
 * Later metadata objects take precedence for duplicate keys.
 *
 * @param metadataList - Array of metadata objects to merge
 * @returns Merged GrpcMetadata instance
 *
 * @example
 * ```typescript
 * const merged = mergeMetadata(baseMetadata, authMetadata, traceMetadata);
 * ```
 */
export function mergeMetadata(...metadataList: GrpcMetadata[]): GrpcMetadata {
  const result = new GrpcMetadata();

  metadataList.forEach((metadata) => {
    metadata.getKeys().forEach((key) => {
      const values = metadata.getAll(key);
      values.forEach((value) => result.add(key, value));
    });
  });

  return result;
}

/**
 * Filters metadata by key prefix.
 *
 * @param metadata - Source metadata
 * @param prefix - Key prefix to filter by
 * @returns New GrpcMetadata with only matching keys
 *
 * @example
 * ```typescript
 * const xHeaders = filterMetadataByPrefix(metadata, 'x-');
 * ```
 */
export function filterMetadataByPrefix(
  metadata: GrpcMetadata,
  prefix: string
): GrpcMetadata {
  const filtered = new GrpcMetadata();

  metadata.getKeys().forEach((key) => {
    if (key.startsWith(prefix)) {
      const values = metadata.getAll(key);
      values.forEach((value) => filtered.add(key, value));
    }
  });

  return filtered;
}

/**
 * Converts metadata to a plain object (single values only).
 * If a key has multiple values, only the first is included.
 *
 * @param metadata - GrpcMetadata instance
 * @returns Plain object
 *
 * @example
 * ```typescript
 * const obj = metadataToObject(metadata);
 * // { 'authorization': 'Bearer ...', 'x-trace-id': '...' }
 * ```
 */
export function metadataToObject(
  metadata: GrpcMetadata
): Record<string, string | Uint8Array> {
  const result: Record<string, string | Uint8Array> = {};

  metadata.getKeys().forEach((key) => {
    const value = metadata.get(key);
    if (value !== undefined) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Checks if metadata contains a specific key.
 *
 * @param metadata - GrpcMetadata instance
 * @param key - Key to check (case-insensitive)
 * @returns True if key exists
 */
export function hasMetadataKey(metadata: GrpcMetadata, key: string): boolean {
  return metadata.has(key);
}

/**
 * Gets a metadata value as a string, handling Uint8Array conversion.
 *
 * @param metadata - GrpcMetadata instance
 * @param key - Metadata key
 * @returns String value or undefined
 */
export function getMetadataAsString(
  metadata: GrpcMetadata,
  key: string
): string | undefined {
  const value = metadata.get(key);
  if (value === undefined) return undefined;
  return isUint8Array(value) ? uint8ArrayToString(value) : value;
}
