import { gzip, ungzip } from '../gzip';

// Mock NitroModules before importing the util
const mockGzip = (data: ArrayBuffer): ArrayBuffer => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const zlib = require('zlib');
  const buffer = new Uint8Array(data);
  return zlib.gzipSync(buffer);
};

const mockUngzip = (data: ArrayBuffer): ArrayBuffer => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const zlib = require('zlib');
  const buffer = new Uint8Array(data);
  return zlib.gunzipSync(buffer);
};

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => ({
      gzip: (data: ArrayBuffer) => mockGzip(data),
      ungzip: (data: ArrayBuffer) => mockUngzip(data),
    }),
  },
}));

describe('gzipUtils', () => {
  it('compresses and decompresses correctly', () => {
    const input = new TextEncoder().encode('Hello Gzip World!');
    const compressed = gzip(input);

    // Gzip output should be different from input
    expect(compressed).not.toEqual(input);
    expect(compressed.length).toBeGreaterThan(0);

    const decompressed = ungzip(compressed);
    const outputString = new TextDecoder().decode(decompressed);

    expect(outputString).toBe('Hello Gzip World!');
  });

  it('handles empty input', () => {
    const input = new Uint8Array(0);
    const compressed = gzip(input);
    const decompressed = ungzip(compressed);

    expect(decompressed.length).toBe(0);
  });

  it('handles binary data', () => {
    const input = new Uint8Array([0, 1, 2, 3, 255, 254]);
    const compressed = gzip(input);
    const decompressed = ungzip(compressed);

    expect(decompressed).toEqual(input);
  });
});
