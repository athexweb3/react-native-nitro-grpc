/**
 * Serializes a message to ArrayBuffer.
 * @internal
 */
export function serializeMessage<T>(message: T): ArrayBuffer {
  // TODO: Implement proper protobuf serialization
  // For now, use JSON as placeholder
  if (message instanceof Uint8Array) {
    // Create a copy of the buffer to ensure we only send the valid range
    // and not the entire underlying buffer if it's a view.
    // Also acts as a safeguard against side effects.
    // .slice() on TypedArray creates a copy of the view's data.
    return message.slice().buffer as ArrayBuffer;
  }
  const json = JSON.stringify(message);
  const encoder = new TextEncoder();
  return encoder.encode(json).buffer as ArrayBuffer;
}

/**
 * Deserializes a message from ArrayBuffer.
 * @internal
 */
export function deserializeMessage<T>(buffer: ArrayBuffer): T {
  // TODO: Implement proper protobuf deserialization
  // For now, try JSON, fallback to buffer
  try {
    const decoder = new TextDecoder();
    const json = decoder.decode(buffer);
    return JSON.parse(json) as T;
  } catch {
    return buffer as unknown as T;
  }
}
