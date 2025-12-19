import { BidiStreamImpl, ClientStreamImpl, ServerStreamImpl } from '..';
import type { GrpcStream } from '../../specs/GrpcStream.nitro';
import { GrpcStatus } from '../../types/grpc-status';
import { GrpcMetadata } from '../../types/metadata';

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

  // HybridObject requirements
  public get name(): string {
    return 'MockHybridStream';
  }
  public equals(other: GrpcStream): boolean {
    return this === other;
  }
  public dispose(): void {}

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

  // Sync methods (stubs for basic tests)
  readSync(): ArrayBuffer | null {
    return null;
  }

  writeSync(data: ArrayBuffer): void {
    this.writtenData.push(data);
  }

  finishSync(): ArrayBuffer | null {
    this.isWritesDone = true;
    return null;
  }
}

// Mock client handlers removed as they are no longer passed to constructor
// We spy on the util functions instead

describe('StreamImplementations', () => {
  let mockHybrid: MockHybridStream;

  beforeEach(() => {
    mockHybrid = new MockHybridStream();
    // Reset mocks
    jest.clearAllMocks();

    // Spy on the serialization utils
    // Note: Since we are in the same package, we might need to mock the module
    // But for unit tests of the class, we can just rely on the real implementation or mock it if needed.
    // The previous test mocked _serializeMessage on the client object.
    // Now the classes call the global functions.
    // For simplicity, let's assume the real functions work (JSON based).
    // Or if we want to spy:
    // We would need to import * as Serialization from '../../utils/serialization'
    // But let's just stick to checking the output which uses the real logic.
  });

  describe('ServerStreamImpl', () => {
    let stream: ServerStreamImpl<string>;

    beforeEach(() => {
      stream = new ServerStreamImpl(mockHybrid);
    });

    it('emits data events', () => {
      const dataSpy = jest.fn();
      stream.on('data', dataSpy);

      // We use real serialization in tests now (JSON based as per current impl)
      const testData = 'test-payload';
      const encoded = new TextEncoder().encode(JSON.stringify(testData));

      mockHybrid.simulateData(encoded.buffer as ArrayBuffer);

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
      stream = new ClientStreamImpl(mockHybrid);
    });

    it('writes data to hybrid stream', () => {
      stream.write('msg1');
      expect(mockHybrid.writtenData).toHaveLength(1);

      // Verify data using real deserialization logic
      const written = new Uint8Array(mockHybrid.writtenData[0]!);
      const decoded = JSON.parse(new TextDecoder().decode(written));
      expect(decoded).toBe('msg1');
    });

    it('signals writesDone', () => {
      stream.end();
      expect(mockHybrid.isWritesDone).toBe(true);
    });

    it('resolves promise on response', async () => {
      const promise = stream.getResponse();

      const response = 'response-data';
      const encoded = new TextEncoder().encode(JSON.stringify(response));
      mockHybrid.simulateData(encoded.buffer as ArrayBuffer);

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
      stream = new BidiStreamImpl(mockHybrid);
    });

    it('handles full duplex communication', () => {
      const dataSpy = jest.fn();
      stream.on('data', dataSpy);

      // Write
      stream.write('ping');
      expect(mockHybrid.writtenData).toHaveLength(1);

      // Read
      const pong = 'pong';
      const encoded = new TextEncoder().encode(JSON.stringify(pong));
      mockHybrid.simulateData(encoded.buffer as ArrayBuffer);
      expect(dataSpy).toHaveBeenCalledWith('pong');
    });
  });
});
