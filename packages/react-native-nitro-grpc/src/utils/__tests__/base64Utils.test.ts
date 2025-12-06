import {
  encodeBase64,
  decodeBase64,
  stringToUint8Array,
  uint8ArrayToString,
  isUint8Array,
} from '../base64Utils';

describe('base64Utils', () => {
  describe('encodeBase64', () => {
    it('encodes standard strings correctly', () => {
      expect(encodeBase64(stringToUint8Array('Hello, World!'))).toBe(
        'SGVsbG8sIFdvcmxkIQ=='
      );
    });

    it('encodes binary data correctly', () => {
      const data = new Uint8Array([0, 1, 2, 3, 255]);
      expect(encodeBase64(data)).toBe('AAECA/8=');
    });

    it('handles empty input', () => {
      expect(encodeBase64(new Uint8Array(0))).toBe('');
    });
  });

  describe('decodeBase64', () => {
    it('decodes standard base64 strings', () => {
      const decoded = decodeBase64('SGVsbG8sIFdvcmxkIQ==');
      expect(uint8ArrayToString(decoded)).toBe('Hello, World!');
    });

    it('decodes binary data', () => {
      const decoded = decodeBase64('AAECA/8=');
      expect(decoded).toEqual(new Uint8Array([0, 1, 2, 3, 255]));
    });

    it('handles empty strings', () => {
      expect(decodeBase64('')).toEqual(new Uint8Array(0));
    });
  });

  describe('string conversions', () => {
    it('converts string to Uint8Array and back', () => {
      const str = 'Test String 123';
      const uint8 = stringToUint8Array(str);
      const backToStr = uint8ArrayToString(uint8);
      expect(backToStr).toBe(str);
    });
  });

  describe('isUint8Array', () => {
    it('returns true for Uint8Array', () => {
      expect(isUint8Array(new Uint8Array(1))).toBe(true);
    });

    it('returns false for other types', () => {
      expect(isUint8Array([])).toBe(false);
      expect(isUint8Array('string')).toBe(false);
      expect(isUint8Array(123)).toBe(false);
      expect(isUint8Array({})).toBe(false);
      expect(isUint8Array(null)).toBe(false);
    });
  });
});
