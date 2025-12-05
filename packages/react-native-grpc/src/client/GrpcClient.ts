import { NitroModules } from 'react-native-nitro-modules';
import type { GrpcClient as HybridGrpcClient } from '../specs/GrpcClient.nitro';
// import type { Metadata } from '../types/Metadata';
// import { GrpcStatus } from '../types/GrpcStatus';
import type { GrpcCallOptions } from './GrpcCallOptions';

export class GrpcClient {
    private _hybrid: HybridGrpcClient;

    constructor() {
        this._hybrid = NitroModules.createHybridObject<HybridGrpcClient>('GrpcClient');
    }

    // Placeholder to avoid unused variable errors until implemented
    public connect(host: string, isInsecure: boolean): void {
        this._hybrid.connect(host, isInsecure);
    }

    public async unaryCall(_method: string, _data: Uint8Array, _options?: GrpcCallOptions): Promise<Uint8Array> {
        // TODO: Implement proper serialization/deserialization
        // For now just pass through to match interface
        return new Uint8Array(0);
    }
}
