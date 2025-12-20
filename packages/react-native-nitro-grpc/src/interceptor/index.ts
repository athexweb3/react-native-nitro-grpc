// Export all types
export * from '../types/interceptor';

import type {
  UnaryInterceptor,
  ServerStreamingInterceptor,
  ClientStreamingInterceptor,
  BidiStreamingInterceptor,
} from '../types/interceptor';

export interface GrpcInterceptor {
  unary?: UnaryInterceptor;
  serverStreaming?: ServerStreamingInterceptor;
  clientStreaming?: ClientStreamingInterceptor;
  bidiStreaming?: BidiStreamingInterceptor;
}
