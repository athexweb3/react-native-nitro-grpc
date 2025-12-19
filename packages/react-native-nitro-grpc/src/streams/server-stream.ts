import type { GrpcStream as HybridGrpcStream } from '../specs/GrpcStream.nitro';
import type { StatusObject } from '../types/channel-types';
import { GrpcError } from '../types/grpc-error';
import { GrpcStatus } from '../types/grpc-status';
import { GrpcMetadata } from '../types/metadata';
import { ServerStream } from '../types/stream';
import { deserializeMessage } from '../utils/serialization';

/**
 * Async server streaming implementation (EventEmitter-based).
 * @internal
 */
export class ServerStreamImpl<Res> extends ServerStream<Res> {
  private _hybrid: HybridGrpcStream;

  constructor(hybridStream: HybridGrpcStream) {
    super();
    this._hybrid = hybridStream;

    // Wire up hybrid callbacks to event emitters
    this._hybrid.onData((data: ArrayBuffer) => {
      try {
        const message = deserializeMessage<Res>(data);
        this.emit('data', message);
      } catch (error) {
        this.emit('error', this._wrapError(error));
      }
    });

    this._hybrid.onMetadata((metadataJson: string) => {
      try {
        const metadata = GrpcMetadata.fromJSON(JSON.parse(metadataJson));
        this.emit('metadata', metadata);
      } catch (error) {
        console.warn('[ServerStream] Failed to parse metadata:', error);
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
          this.emit(
            'error',
            new GrpcError(code as GrpcStatus, message, metadata)
          );
        } else {
          this.emit('end');
        }
      }
    );

    this._hybrid.onError((errorMsg: string) => {
      this.emit('error', new GrpcError(GrpcStatus.UNKNOWN, errorMsg));
    });
  }

  cancel(): void {
    if (!this._cancelled) {
      this._cancelled = true;
      this._hybrid.cancel();
      this.emit(
        'error',
        new GrpcError(GrpcStatus.CANCELLED, 'Stream cancelled')
      );
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
 * Sync server streaming implementation (Iterator-based).
 * @internal
 */
export class SyncServerStreamImpl<T> implements Iterable<T> {
  constructor(
    private _hybrid: HybridGrpcStream,
    private _deserialize: (buffer: ArrayBuffer) => T
  ) {}

  [Symbol.iterator](): Iterator<T> {
    return {
      next: (): IteratorResult<T> => {
        const data = this._hybrid.readSync();
        if (data === null) {
          return { done: true, value: undefined };
        }
        const message = this._deserialize(data);
        return { done: false, value: message };
      },
    };
  }

  cancel(): void {
    this._hybrid.cancel();
  }
}
