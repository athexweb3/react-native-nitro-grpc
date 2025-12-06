import {
  ServerStreamImpl,
  ClientStreamImpl,
  BidiStreamImpl,
} from '../StreamImplementations';
import type { GrpcStream } from '../../specs/GrpcStream.nitro';
import { GrpcMetadata } from '../../types/GrpcMetadata';
import { GrpcStatus } from '../../types/GrpcStatus';
import {
  stringToUint8Array,
  uint8ArrayToString,
} from '../../utils/base64Utils';

// Mock implementation of HybridGrpcStream
class MockHybridStream implements GrpcStream {
  // Callbacks
  private _onData?: (data: ArrayBuffer) => void;
  private _onMetadata?: (metadataJson: string) => void;
  private _onStatus?: (
    code: number,
    message: string,
    metadataJson: string
  ) => void;
  private _onError?: (error: string) => void;

  // Track writes
  public writtenData: ArrayBuffer[] = [];
  public isWritesDone = false;
  public isCancelled = false;

  constructor() {}

  // Simulator methods to trigger events from tests
  simulateData(data: ArrayBuffer) {
    this._onData?.(data);
  }

  simulateMetadata(metadata: GrpcMetadata) {
    this._onMetadata?.(JSON.stringify(metadata.toJSON()));
  }

  simulateStatus(code: number, message: string, metadata?: GrpcMetadata) {
    const mdJson = metadata ? JSON.stringify(metadata.toJSON()) : '{}';
    this._onStatus?.(code, message, mdJson);
  }

  simulateError(error: string) {
    this._onError?.(error);
  }

  // Interface methods
  write(data: ArrayBuffer): void {
    this.writtenData.push(data);
  }

  writesDone(): void {
    this.isWritesDone = true;
  }

  onData(callback: (data: ArrayBuffer) => void): void {
    this._onData = callback;
  }

  onMetadata(callback: (metadataJson: string) => void): void {
    this._onMetadata = callback;
  }

  onStatus(
    callback: (code: number, message: string, metadataJson: string) => void
  ): void {
    this._onStatus = callback;
  }

  onError(callback: (error: string) => void): void {
    this._onError = callback;
  }

  cancel(): void {
    this.isCancelled = true;
  }
}

// Mock client handlers
const mockClient = {
  _serializeMessage: jest.fn((msg: string) => stringToUint8Array(msg)),
  _deserializeMessage: jest.fn((buffer: ArrayBuffer) =>
    uint8ArrayToString(new Uint8Array(buffer))
  ),
};

describe('StreamImplementations', () => {
  let mockHybrid: MockHybridStream;

  beforeEach(() => {
    mockHybrid = new MockHybridStream();
    mockClient._serializeMessage.mockClear();
    mockClient._deserializeMessage.mockClear();
  });

  describe('ServerStreamImpl', () => {
    let stream: ServerStreamImpl<string>;

    beforeEach(() => {
      stream = new ServerStreamImpl(mockHybrid, mockClient);
    });

    it('emits data events', () => {
      const dataSpy = jest.fn();
      stream.on('data', dataSpy);

      const payload = stringToUint8Array('test-payload');
      mockHybrid.simulateData(payload.buffer);

      expect(mockClient._deserializeMessage).toHaveBeenCalledWith(
        payload.buffer
      );
      expect(dataSpy).toHaveBeenCalledWith('test-payload');
    });

    it('emits metadata events', () => {
      const metadataSpy = jest.fn();
      stream.on('metadata', metadataSpy);

      const md = new GrpcMetadata({ key: 'value' });
      mockHybrid.simulateMetadata(md);

      expect(metadataSpy).toHaveBeenCalledWith(expect.any(GrpcMetadata));
      const receivedMd = metadataSpy.mock.calls[0][0] as GrpcMetadata;
      expect(receivedMd.get('key')).toBe('value');
    });

    it('emits status and end on OK', () => {
      const statusSpy = jest.fn();
      const endSpy = jest.fn();
      stream.on('status', statusSpy);
      stream.on('end', endSpy);

      mockHybrid.simulateStatus(GrpcStatus.OK, 'OK');

      expect(statusSpy).toHaveBeenCalledWith({
        code: GrpcStatus.OK,
        details: 'OK',
        metadata: expect.any(GrpcMetadata),
      });
      expect(endSpy).toHaveBeenCalled();
    });

    it('emits error on non-OK status', () => {
      const errorSpy = jest.fn();
      stream.on('error', errorSpy);

      mockHybrid.simulateStatus(GrpcStatus.INTERNAL, 'Internal Error');

      expect(errorSpy).toHaveBeenCalled();
      const error = errorSpy.mock.calls[0][0];
      expect(error.code).toBe(GrpcStatus.INTERNAL);
      expect(error.message).toContain('Internal Error');
    });

    it('propagates cancellation', () => {
      stream.cancel();
      expect(mockHybrid.isCancelled).toBe(true);
    });
  });

  describe('ClientStreamImpl', () => {
    let stream: ClientStreamImpl<string, string>;

    beforeEach(() => {
      stream = new ClientStreamImpl(mockHybrid, mockClient);
    });

    it('writes data to hybrid stream', () => {
      stream.write('msg1');
      expect(mockClient._serializeMessage).toHaveBeenCalledWith('msg1');
      expect(mockHybrid.writtenData).toHaveLength(1);

      const written = new Uint8Array(mockHybrid.writtenData[0]);
      expect(uint8ArrayToString(written)).toBe('msg1');
    });

    it('signals writesDone', () => {
      stream.end();
      expect(mockHybrid.isWritesDone).toBe(true);
    });

    it('resolves promise on response', async () => {
      const promise = stream.getResponse();

      const response = stringToUint8Array('response-data');
      mockHybrid.simulateData(response.buffer);

      await expect(promise).resolves.toBe('response-data');
    });

    it('rejects promise on error status', async () => {
      const promise = stream.getResponse();
      mockHybrid.simulateStatus(GrpcStatus.UNAVAILABLE, 'Service Unavailable');
      await expect(promise).rejects.toThrow('Service Unavailable');
    });
  });

  describe('BidiStreamImpl', () => {
    let stream: BidiStreamImpl<string, string>;

    beforeEach(() => {
      stream = new BidiStreamImpl(mockHybrid, mockClient);
    });

    it('handles full duplex communication', () => {
      const dataSpy = jest.fn();
      stream.on('data', dataSpy);

      // Write
      stream.write('ping');
      expect(mockHybrid.writtenData).toHaveLength(1);

      // Read
      const pong = stringToUint8Array('pong');
      mockHybrid.simulateData(pong.buffer);
      expect(dataSpy).toHaveBeenCalledWith('pong');
    });
  });
});
