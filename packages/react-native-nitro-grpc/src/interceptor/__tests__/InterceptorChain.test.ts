import { GrpcChannel } from '../../client/channel';
import { GrpcClient } from '../../client/client';
import { type GrpcInterceptor } from '../../types/interceptor';
import { GrpcMetadata } from '../../types/metadata';

// Mock GrpcChannel and HybridClient
const mockHybridClient = {
  unaryCall: jest.fn(),
  close: jest.fn(),
};

const mockChannel = {
  _getHybridClient: () => mockHybridClient,
} as unknown as GrpcChannel;

// Mock NitroModules to prevent native load error
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => mockHybridClient,
  },
}));

describe('Interceptor Chain', () => {
  let client: GrpcClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Return "{}" as bytes: [123, 125]
    mockHybridClient.unaryCall.mockResolvedValue(new Uint8Array([123, 125]));
  });

  it('executes interceptors in order', async () => {
    const order: string[] = [];

    const interceptor1: GrpcInterceptor = {
      unary: async <Req, Res>(
        method: string,
        req: Req,
        options: import('../../types/call-options').GrpcCallOptions,
        next: import('../../types/interceptor').NextUnaryFn
      ) => {
        order.push('1-start');
        const res = await next(method, req, options);
        order.push('1-end');
        return res as Res;
      },
    };

    const interceptor2: GrpcInterceptor = {
      unary: async <Req, Res>(
        method: string,
        req: Req,
        options: import('../../types/call-options').GrpcCallOptions,
        next: import('../../types/interceptor').NextUnaryFn
      ) => {
        order.push('2-start');
        const res = await next(method, req, options);
        order.push('2-end');
        return res as Res;
      },
    };

    client = new GrpcClient(mockChannel, [interceptor1, interceptor2]);

    await client.unaryCall('/test', new Uint8Array(), {
      metadata: new GrpcMetadata(),
    });

    expect(order).toEqual(['1-start', '2-start', '2-end', '1-end']);
  });

  it('propagates metadata changes downstream', async () => {
    const interceptor: GrpcInterceptor = {
      unary: async <Req, Res>(
        method: string,
        req: Req,
        options: import('../../types/call-options').GrpcCallOptions,
        next: import('../../types/interceptor').NextUnaryFn
      ) => {
        const metadata = options.metadata || new GrpcMetadata();
        metadata.add('custom-header', 'value');
        return next(method, req, { ...options, metadata }) as Promise<Res>;
      },
    };

    client = new GrpcClient(mockChannel, [interceptor]);

    await client.unaryCall('/test', new Uint8Array());

    // Verify native call received the modified metadata
    const lastCall = mockHybridClient.unaryCall.mock.calls[0];
    const metadataJson = lastCall[2]; // 3rd arg is metadataJson
    expect(metadataJson).toContain('custom-header');
    expect(metadataJson).toContain('value');
  });

  it('handles errors from interceptors', async () => {
    const errorInterceptor: GrpcInterceptor = {
      unary: async () => {
        throw new Error('Interceptor failed');
      },
    };

    client = new GrpcClient(mockChannel, [errorInterceptor]);

    await expect(client.unaryCall('/test', new Uint8Array())).rejects.toThrow(
      'Interceptor failed'
    );

    // Native call should NOT have happened
    expect(mockHybridClient.unaryCall).not.toHaveBeenCalled();
  });

  it('handles errors from native call', async () => {
    mockHybridClient.unaryCall.mockRejectedValue(new Error('Native error'));

    const passThroughInterceptor: GrpcInterceptor = {
      unary: async (m, r, o, next) => next(m, r, o),
    };

    client = new GrpcClient(mockChannel, [passThroughInterceptor]);

    await expect(client.unaryCall('/test', new Uint8Array())).rejects.toThrow(
      'Native error'
    );
  });
});
