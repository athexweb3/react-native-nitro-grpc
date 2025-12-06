/**
 * Metadata handler for gRPC calls.
 * Metadata is sent as HTTP/2 headers and can contain authentication tokens,
 * tracing information, or any custom key-value pairs.
 *
 * Keys are case-insensitive ASCII strings.
 * Values can be strings or binary data (for keys ending with '-bin').
 *
 * @example
 * ```typescript
 * const metadata = new GrpcMetadata();
 * metadata.add('authorization', 'Bearer token123');
 * metadata.add('trace-id', 'abc-123');
 * metadata.add('custom-bin', Buffer.from([1, 2, 3]));
 * ```
 */
export class GrpcMetadata {
  private _map: Map<string, Array<string | Buffer>>;

  constructor() {
    this._map = new Map();
  }

  /**
   * Adds a key-value pair to the metadata.
   * If the key already exists, the value is appended to the list.
   *
   * @param key - Metadata key (case-insensitive)
   * @param value - String or Buffer value
   */
  add(key: string, value: string | Buffer): void {
    const normalizedKey = key.toLowerCase();
    const existing = this._map.get(normalizedKey) || [];
    existing.push(value);
    this._map.set(normalizedKey, existing);
  }

  /**
   * Sets a key-value pair, replacing any existing values for that key.
   *
   * @param key - Metadata key (case-insensitive)
   * @param value - String or Buffer value
   */
  set(key: string, value: string | Buffer): void {
    const normalizedKey = key.toLowerCase();
    this._map.set(normalizedKey, [value]);
  }

  /**
   * Gets the first value for a given key.
   *
   * @param key - Metadata key (case-insensitive)
   * @returns The first value, or undefined if key doesn't exist
   */
  get(key: string): string | Buffer | undefined {
    const normalizedKey = key.toLowerCase();
    const values = this._map.get(normalizedKey);
    return values?.[0];
  }

  /**
   * Gets all values for a given key.
   *
   * @param key - Metadata key (case-insensitive)
   * @returns Array of all values for the key
   */
  getAll(key: string): Array<string | Buffer> {
    const normalizedKey = key.toLowerCase();
    return this._map.get(normalizedKey) || [];
  }

  /**
   * Removes all values for a given key.
   *
   * @param key - Metadata key (case-insensitive)
   */
  remove(key: string): void {
    const normalizedKey = key.toLowerCase();
    this._map.delete(normalizedKey);
  }

  /**
   * Clones the metadata object.
   *
   * @returns A new GrpcMetadata instance with the same key-value pairs
   */
  clone(): GrpcMetadata {
    const cloned = new GrpcMetadata();
    this._map.forEach((values, key) => {
      cloned._map.set(key, [...values]);
    });
    return cloned;
  }

  /**
   * Converts metadata to a plain JSON object for C++ bridge.
   * Binary values are base64-encoded.
   *
   * @internal
   * @returns Plain object representation
   */
  toJSON(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    this._map.forEach((values, key) => {
      result[key] = values.map((v) =>
        Buffer.isBuffer(v) ? v.toString('base64') : v
      );
    });
    return result;
  }

  /**
   * Creates a GrpcMetadata instance from a plain object.
   *
   * @internal
   * @param json - Plain object with string array values
   * @returns New GrpcMetadata instance
   */
  static fromJSON(json: Record<string, string[]>): GrpcMetadata {
    const metadata = new GrpcMetadata();
    Object.entries(json).forEach(([key, values]) => {
      values.forEach((value) => {
        // Detect base64-encoded binary data (keys ending with '-bin')
        if (key.endsWith('-bin')) {
          metadata.add(key, Buffer.from(value, 'base64'));
        } else {
          metadata.add(key, value);
        }
      });
    });
    return metadata;
  }

  /**
   * Gets all keys in the metadata.
   *
   * @returns Array of all metadata keys
   */
  getKeys(): string[] {
    return Array.from(this._map.keys());
  }

  /**
   * Checks if a key exists in the metadata.
   *
   * @param key - Metadata key (case-insensitive)
   * @returns True if key exists
   */
  has(key: string): boolean {
    const normalizedKey = key.toLowerCase();
    return this._map.has(normalizedKey);
  }

  /**
   * Gets the number of unique keys in the metadata.
   *
   * @returns Number of keys
   */
  get size(): number {
    return this._map.size;
  }
}
