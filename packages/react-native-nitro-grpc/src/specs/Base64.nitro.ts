import type { HybridObject } from 'react-native-nitro-modules';

export interface Base64 extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  encode(data: ArrayBuffer): string;
  decode(base64: string): ArrayBuffer;
}
