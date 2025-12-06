import { sha256, sha256Bytes } from '../sha256Utils';

// Mock NitroModules before importing the util
const mockHash = (data: string | ArrayBuffer) => {
  // Use require to avoid "Cannot find module 'crypto'" TS error without @types/node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');

  let d: Uint8Array;
  if (typeof data === 'string') {
    d = new TextEncoder().encode(data);
  } else {
    d = new Uint8Array(data);
  }

  return crypto.createHash('sha256').update(d).digest('hex');
};

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => ({
      hash: (data: string) => mockHash(data),
      hashBytes: (data: ArrayBuffer) => mockHash(data),
    }),
  },
}));

describe('Local SHA256', () => {
  it('hashes simple data correctly', () => {
    // Expected: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(sha256('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });

  it('hashes bytes correctly', () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('hello');
    const hash = sha256Bytes(data);
    expect(hash).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });

  it('behaves same for string and bytes', () => {
    const text = 'test string';
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);

    expect(sha256(text)).toBe(sha256Bytes(bytes));
  });

  it('handles empty input', () => {
    // SHA256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const expected =
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(sha256('')).toBe(expected);
    expect(sha256Bytes(new Uint8Array(0))).toBe(expected);
  });
});
