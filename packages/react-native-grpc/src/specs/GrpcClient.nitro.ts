import { type HybridObject } from 'react-native-nitro-modules';

export interface GrpcClient extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
    /**
     * Connects to a gRPC server.
     * @param host The server host URL (e.g. "localhost:50051")
     * @param isInsecure Whether to use an insecure connection (no TLS)
     */
    connect(host: string, isInsecure: boolean): void;

    /**
     * Starts a unary call.
     * @param method The method name (e.g. "/MyService/MyMethod")
     * @param data The serialized request message
     * @returns A promise that resolves to the serialized response message
     */
    unaryCall(method: string, data: ArrayBuffer): Promise<ArrayBuffer>;
}
