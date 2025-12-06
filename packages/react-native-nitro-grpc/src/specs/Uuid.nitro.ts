import type { HybridObject } from 'react-native-nitro-modules';

export interface Uuid extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  /**
   * Generates a random UUID v4 string.
   * @returns A string representation of the UUID (e.g., "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx").
   */
  generate(): string;
}
