import type { MethodPath } from './branding';

export interface MethodDefinition<Req, Res> {
  /**
   * The method path (e.g. "/package.Service/Method")
   */
  path: MethodPath;

  /**
   * Whether the request is streaming.
   */
  requestStream: boolean;

  /**
   * Whether the response is streaming.
   */
  responseStream: boolean;

  /**
   * Serializes the request message to binary.
   */
  requestSerialize: (value: Req) => Uint8Array | ArrayBuffer;

  /**
   * Deserializes the response binary to a message.
   */
  responseDeserialize: (bytes: Uint8Array | ArrayBuffer) => Res;
}
