import { stringToUint8Array } from '../../utils/base64';
import { GrpcMetadata } from '../metadata';

describe('GrpcMetadata', () => {
  let metadata: GrpcMetadata;

  beforeEach(() => {
    metadata = new GrpcMetadata();
  });

  it('sets and retrieves string values', () => {
    metadata.set('key', 'value');
    expect(metadata.get('key')).toBe('value');
  });

  it('sets and retrieves binary values (Uint8Array)', () => {
    const binaryValue = stringToUint8Array('binary');
    metadata.set('bin-key', binaryValue);
    const retrieved = metadata.get('bin-key');
    expect(retrieved).toEqual(binaryValue);
  });

  it('normalizes keys to lowercase', () => {
    metadata.set('KEY', 'value');
    expect(metadata.get('key')).toBe('value');
    expect(metadata.get('KEY')).toBe('value');
  });

  it('adds multiple values for the same key', () => {
    metadata.add('multi', 'val1');
    metadata.add('multi', 'val2');
    expect(metadata.getAll('multi')).toEqual(['val1', 'val2']);
  });

  it('serializes to JSON correctly', () => {
    metadata.set('str', 'val');
    metadata.set('bin', stringToUint8Array('test'));

    const json = metadata.toJSON();
    expect(json['str']).toEqual(['val']);
    // 'test' in base64 is 'dGVzdA=='
    expect(json['bin']).toEqual(['dGVzdA==']);
  });

  it('deserializes from JSON correctly', () => {
    const json = {
      'str': ['val'],
      'bin-bin': ['dGVzdA=='], // -bin suffix implies base64 encoded binary
    };

    const fromJson = GrpcMetadata.fromJSON(json);
    expect(fromJson.get('str')).toBe('val');

    // Check binary decoding
    const binVal = fromJson.get('bin-bin');
    expect(binVal).toBeInstanceOf(Uint8Array);
    expect(binVal).toEqual(stringToUint8Array('test'));
  });

  it('initializes with values', () => {
    const md = new GrpcMetadata({
      init: 'val',
    });
    expect(md.get('init')).toBe('val');
  });
});
