import type { GrpcStream as HybridGrpcStream } from '../specs/GrpcStream.nitro';
import type { StatusObject } from '../types/ChannelTypes';
import { GrpcError } from '../types/GrpcError';
import { GrpcStatus } from '../types/GrpcStatus';
import { GrpcMetadata } from '../types/metadata';
import { BidiStream, ClientStream, ServerStream } from '../types/stream';
import { serializeMessage, deserializeMessage } from '../utils/serialization';

/**
 * Server streaming implementation (read-only).
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
 * Client streaming implementation (write-only).
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
 * Bidirectional streaming implementation (read and write).
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

  private _wrapError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(String(error));
  }
}
