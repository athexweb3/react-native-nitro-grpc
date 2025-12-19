/**
 * Definition of a gRPC method.
 * This interface allows providing custom serialization and deserialization logic,
 * typically generated from .proto files.
 */
export interface MethodDefinition<Req, Res> {
  /**
   * The method path (e.g. "/package.Service/Method")
   */
  path: string;

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
