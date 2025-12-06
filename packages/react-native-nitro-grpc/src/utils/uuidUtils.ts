import { NitroModules } from 'react-native-nitro-modules';
import type { Uuid } from '../specs/Uuid.nitro';

// Load the Hybrid Object
const HybridUuid = NitroModules.createHybridObject<Uuid>('Uuid');

/**
 * Generates a random UUID v4.
 * @returns A string representation of the UUID.
 */
export function generateUUID(): string {
  return HybridUuid.generate();
}
