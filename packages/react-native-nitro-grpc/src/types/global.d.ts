/**
 * Type declarations for React Native global APIs.
 * TextEncoder and TextDecoder are available natively in React Native.
 */

declare class TextEncoder {
  readonly encoding: string;
  encode(input?: string): Uint8Array;
}

declare class TextDecoder {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
  constructor(
    label?: string,
    options?: { fatal?: boolean; ignoreBOM?: boolean }
  );
  decode(input?: BufferSource, options?: { stream?: boolean }): string;
}

type BufferSource = ArrayBufferView | ArrayBuffer;
