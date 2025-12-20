import type { GrpcCallOptions } from './call-options';
import type { MethodPath } from './branding';

/**
 * Next function for unary interceptors.
 * Calls the next interceptor or the actual transport.
 */
export type NextUnaryFn = <Req, Res>(
  method: MethodPath,
  request: Req,
  options: Readonly<GrpcCallOptions>
) => Promise<Res>;

/**
 * Interceptor for unary calls.
 * Can modify the request, options, or handle errors/response.
 */
export type UnaryInterceptor = <Req, Res>(
  method: MethodPath,
  request: Req,
  options: Readonly<GrpcCallOptions>,
  next: NextUnaryFn
) => Promise<Res>;

export type NextServerStreamingFn = <Req, Res>(
  method: MethodPath,
  request: Req,
  options: Readonly<GrpcCallOptions>
) => import('./stream').ServerStream<Res>;

export type ServerStreamingInterceptor = <Req, Res>(
  method: MethodPath,
  request: Req,
  options: Readonly<GrpcCallOptions>,
  next: NextServerStreamingFn
) => import('./stream').ServerStream<Res>;

export type NextClientStreamingFn = <Req, Res>(
  method: MethodPath,
  options: Readonly<GrpcCallOptions>
) => import('./stream').ClientStream<Req, Res>;

export type ClientStreamingInterceptor = <Req, Res>(
  method: MethodPath,
  options: Readonly<GrpcCallOptions>,
  next: NextClientStreamingFn
) => import('./stream').ClientStream<Req, Res>;

export type NextBidiStreamingFn = <Req, Res>(
  method: MethodPath,
  options: Readonly<GrpcCallOptions>
) => import('./stream').BidiStream<Req, Res>;

export type BidiStreamingInterceptor = <Req, Res>(
  method: MethodPath,
  options: Readonly<GrpcCallOptions>,
  next: NextBidiStreamingFn
) => import('./stream').BidiStream<Req, Res>;

export interface GrpcInterceptor {
  unary?: UnaryInterceptor;
  serverStreaming?: ServerStreamingInterceptor;
  clientStreaming?: ClientStreamingInterceptor;
  bidiStreaming?: BidiStreamingInterceptor;
}
