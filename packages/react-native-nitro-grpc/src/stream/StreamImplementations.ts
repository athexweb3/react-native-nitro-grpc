import type { GrpcStream as HybridGrpcStream } from '../specs/GrpcStream.nitro';
import { ServerStream, ClientStream, BidiStream } from '../types/StreamTypes';
import { GrpcMetadata } from '../types/GrpcMetadata';
import { GrpcError } from '../types/GrpcError';
import { GrpcStatus } from '../types/GrpcStatus';
import type { StatusObject } from '../types/ChannelTypes';

/**
 * Server streaming implementation (read-only).
 * @internal
 */
export class ServerStreamImpl<Res> extends ServerStream<Res> {
  private _hybrid: HybridGrpcStream;
  private _client: { _deserializeMessage<T>(buffer: ArrayBuffer): T };

  constructor(
    hybridStream: HybridGrpcStream,
    client: { _deserializeMessage<T>(buffer: ArrayBuffer): T }
  ) {
    super();
    this._hybrid = hybridStream;
    this._client = client;

    // Wire up hybrid callbacks to event emitters
    this._hybrid.onData((data: ArrayBuffer) => {
      try {
        const message = this._client._deserializeMessage<Res>(data);
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
  private _client: {
    _serializeMessage<T>(message: T): ArrayBuffer;
    _deserializeMessage<T>(buffer: ArrayBuffer): T;
  };
  private _responsePromise: Promise<Res>;
  private _resolveResponse!: (value: Res) => void;
  private _rejectResponse!: (error: Error) => void;

  constructor(
    hybridStream: HybridGrpcStream,
    client: {
      _serializeMessage<T>(message: T): ArrayBuffer;
      _deserializeMessage<T>(buffer: ArrayBuffer): T;
    }
  ) {
    super();
    this._hybrid = hybridStream;
    this._client = client;

    // Create response promise
    this._responsePromise = new Promise<Res>((resolve, reject) => {
      this._resolveResponse = resolve;
      this._rejectResponse = reject;
    });

    // Wire up callbacks
    this._hybrid.onData((data: ArrayBuffer) => {
      try {
        const message = this._client._deserializeMessage<Res>(data);
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
      const buffer = this._client._serializeMessage(data);
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
  private _client: {
    _serializeMessage<T>(message: T): ArrayBuffer;
    _deserializeMessage<T>(buffer: ArrayBuffer): T;
  };

  constructor(
    hybridStream: HybridGrpcStream,
    client: {
      _serializeMessage<T>(message: T): ArrayBuffer;
      _deserializeMessage<T>(buffer: ArrayBuffer): T;
    }
  ) {
    super();
    this._hybrid = hybridStream;
    this._client = client;

    // Wire up hybrid callbacks
    this._hybrid.onData((data: ArrayBuffer) => {
      try {
        const message = this._client._deserializeMessage<Res>(data);
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
      const buffer = this._client._serializeMessage(data);
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
