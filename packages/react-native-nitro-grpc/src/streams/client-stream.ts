import type { GrpcStream as HybridGrpcStream } from '../specs/GrpcStream.nitro';
import type { StatusObject } from '../types/channel-types';
import { GrpcError } from '../types/grpc-error';
import { GrpcStatus } from '../types/grpc-status';
import { GrpcMetadata } from '../types/metadata';
import { ClientStream } from '../types/stream';
import { serializeMessage, deserializeMessage } from '../utils/serialization';

/**
 * Async client streaming implementation (EventEmitter-based).
 * @internal
 */
export class ClientStreamImpl<Req, Res> extends ClientStream<Req, Res> {
  private _hybrid: HybridGrpcStream;
  private _responsePromise: Promise<Res>;
  private _resolveResponse!: (value: Res) => void;
  private _rejectResponse!: (error: Error) => void;

  constructor(hybridStream: HybridGrpcStream) {
    super();
    this._hybrid = hybridStream;

    // Create response promise
    this._responsePromise = new Promise<Res>((resolve, reject) => {
      this._resolveResponse = resolve;
      this._rejectResponse = reject;
    });

    // Wire up callbacks
    this._hybrid.onData((data: ArrayBuffer) => {
      try {
        const message = deserializeMessage<Res>(data);
        this._resolveResponse(message);
      } catch (error) {
        this._rejectResponse(this._wrapError(error));
      }
    });

    this._hybrid.onMetadata((metadataJson: string) => {
      try {
        const metadata = GrpcMetadata.fromJSON(JSON.parse(metadataJson));
        this.emit('metadata', metadata);
      } catch (error) {
        console.warn('[ClientStream] Failed to parse metadata:', error);
      }
    });

    this._hybrid.onStatus(
      (code: number, message: string, metadataJson: string) => {
        const metadata = GrpcMetadata.fromJSON(
          JSON.parse(metadataJson || '{}')
        );
        const status: StatusObject = { code, details: message, metadata };
        this.emit('status', status);

        if (code !== GrpcStatus.OK) {
          const error = new GrpcError(code as GrpcStatus, message, metadata);
          this.emit('error', error);
          this._rejectResponse(error);
        }
      }
    );

    this._hybrid.onError((errorMsg: string) => {
      const error = new GrpcError(GrpcStatus.UNKNOWN, errorMsg);
      this.emit('error', error);
      this._rejectResponse(error);
    });
  }

  write(data: Req): boolean {
    try {
      const buffer = serializeMessage(data);
      this._hybrid.write(buffer);
      return true; // TODO: Implement backpressure
    } catch (error) {
      this.emit('error', this._wrapError(error));
      return false;
    }
  }

  end(): void {
    this._hybrid.writesDone();
  }

  getResponse(): Promise<Res> {
    return this._responsePromise;
  }

  cancel(): void {
    if (!this._cancelled) {
      this._cancelled = true;
      this._hybrid.cancel();
      const error = new GrpcError(GrpcStatus.CANCELLED, 'Stream cancelled');
      this.emit('error', error);
      this._rejectResponse(error);
    }
  }

  getPeer(): string {
    // TODO: Implement in C++
    return 'unknown';
  }

  private _wrapError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(String(error));
  }
}

/**
 * Sync client streaming implementation (blocking).
 * @internal
 */
export class SyncClientStreamImpl<TReq, TRes> {
  constructor(
    private _hybrid: HybridGrpcStream,
    private _serialize: (message: TReq) => ArrayBuffer,
    private _deserialize: (buffer: ArrayBuffer) => TRes
  ) {}

  writeSync(message: TReq): void {
    const buffer = this._serialize(message);
    this._hybrid.writeSync(buffer);
  }

  finish(): TRes {
    const responseBuffer = this._hybrid.finishSync();
    if (responseBuffer === null) {
      throw new Error('No response received from server');
    }
    return this._deserialize(responseBuffer);
  }

  cancel(): void {
    this._hybrid.cancel();
  }
}
