import { NitroModules } from 'react-native-nitro-modules';
import type { GrpcStream as HybridGrpcStream } from '../specs/GrpcStream.nitro';
import { EventEmitter } from 'eventemitter3';

export class GrpcStream extends EventEmitter {
    private _hybrid: HybridGrpcStream;

    constructor() {
        super();
        this._hybrid = NitroModules.createHybridObject<HybridGrpcStream>('GrpcStream');
        // Suppress unused warning for now
        void this._hybrid;
    }
}
