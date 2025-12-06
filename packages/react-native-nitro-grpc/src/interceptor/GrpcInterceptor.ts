import type { GrpcCallOptions } from '../types/GrpcCallOptions';

/**
 * Next function for unary interceptors.
 * Calls the next interceptor or the actual transport.
 */
export type NextUnaryFn = <Req, Res>(
  method: string,
  request: Req,
  options: GrpcCallOptions
) => Promise<Res>;

/**
 * Interceptor for unary calls.
 * Can modify the request, options, or handle errors/response.
 */
export type UnaryInterceptor = <Req, Res>(
  method: string,
  request: Req,
  options: GrpcCallOptions,
  next: NextUnaryFn
) => Promise<Res>;

// TODO: Streaming Interceptors are more complex, will add later.
// For now, we focus on Unary which covers 90% of auth/logging use cases.

export interface GrpcInterceptor {
  unary?: UnaryInterceptor;
}
