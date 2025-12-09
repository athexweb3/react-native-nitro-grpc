import { generateUUID } from '../uuid';

// Mock NitroModules before importing the util
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => ({
      generate: () => '123e4567-e89b-12d3-a456-426614174000',
    }),
  },
}));

describe('uuidUtils', () => {
  it('generates a UUID string', () => {
    const uuid = generateUUID();
    expect(typeof uuid).toBe('string');
    expect(uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  // Note: Since we are mocking the native implementation, we can't test uniqueness or strict format compliance
  // of the actual C++ code here. That relies on the C++ implementation being correct.
  // The mock just verifies the bridge wiring.
});
