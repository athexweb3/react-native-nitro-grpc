import type { GrpcStream as HybridGrpcStream } from '../specs/GrpcStream.nitro';
import type { StatusObject } from '../types/channel-types';
import { GrpcError } from '../types/grpc-error';
import { GrpcStatus } from '../types/grpc-status';
import { GrpcMetadata } from '../types/metadata';
import { BidiStream } from '../types/stream';
import { serializeMessage, deserializeMessage } from '../utils/serialization';

/**
 * Async bidirectional streaming implementation (EventEmitter-based).
 * @internal
 */
export class BidiStreamImpl<Req, Res> extends BidiStream<Req, Res> {
  private _hybrid: HybridGrpcStream;

  constructor(hybridStream: HybridGrpcStream) {
    super();
    this._hybrid = hybridStream;

    // Wire up hybrid callbacks
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
        console.warn('[BidiStream] Failed to parse metadata:', error);
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

  pause(): void {
    this._hybrid.pause();
  }

  resume(): void {
    this._hybrid.resume();
  }

  private _wrapError(error: unknown): GrpcError {
    if (error instanceof GrpcError) return error;
    return new GrpcError(GrpcStatus.INTERNAL, String(error));
  }
}

/**
 * Sync bidirectional streaming implementation (Iterator-based).
 * @internal
 */
export class SyncBidiStreamImpl<TReq, TRes> implements Iterable<TRes> {
  constructor(
    private _hybrid: HybridGrpcStream,
    private _serialize: (message: TReq) => ArrayBuffer,
    private _deserialize: (buffer: ArrayBuffer) => TRes
  ) {}

  writeSync(message: TReq): void {
    const buffer = this._serialize(message);
    this._hybrid.writeSync(buffer);
  }

  readSync(): TRes | null {
    const data = this._hybrid.readSync();
    if (data === null) {
      return null;
    }
    return this._deserialize(data);
  }

  finish(): void {
    this._hybrid.finishSync();
  }

  [Symbol.iterator](): Iterator<TRes> {
    return {
      next: (): IteratorResult<TRes> => {
        const message = this.readSync();
        if (message === null) {
          return { done: true, value: undefined };
        }
        return { done: false, value: message };
      },
    };
  }

  cancel(): void {
    this._hybrid.cancel();
  }
}
