import type { GrpcClient as HybridGrpcClient } from '../specs/GrpcClient.nitro';
import type { GrpcCallOptions } from '../types/call-options';
import { GrpcMetadata } from '../types/metadata';
import { serializeMessage, deserializeMessage } from '../utils/serialization';
import { toAbsoluteDeadline } from '../utils/deadline';
import { checkAborted } from '../utils/cancellation';
import type {
  GrpcInterceptor,
  UnaryInterceptor,
  NextUnaryFn,
} from '../interceptor';
import type { MethodDefinition } from '../types/method';

/**
 * Makes an asynchronous unary call with interceptors.
 */
export async function unaryCall<Req, Res>(
  hybrid: HybridGrpcClient,
  method: string | MethodDefinition<Req, Res>,
  request: Req,
  options: GrpcCallOptions | undefined,
  interceptors: GrpcInterceptor[]
): Promise<Res> {
  const methodName = typeof method === 'string' ? method : method.path;
  const serializer =
    typeof method === 'object' ? method.requestSerialize : serializeMessage;
  const deserializer =
    typeof method === 'object'
      ? method.responseDeserialize
      : deserializeMessage;

  return applyUnaryInterceptors(
    interceptors,
    methodName,
    request,
    options,
    async (m, r, o) => {
      // Serialize request to ArrayBuffer
      const buffer = serializer(r as Req);
      const requestBuffer =
        buffer instanceof Uint8Array ? buffer.buffer : buffer;

      // Generate a unique call ID
      const callId = Math.random().toString(36).substring(7);

      // Prepare metadata and deadline
      const metadata = o?.metadata || new GrpcMetadata();
      const metadataJson = JSON.stringify(metadata.toJSON());
      const deadlineMs = toAbsoluteDeadline(o?.deadline);

      let onAbort: (() => void) | undefined;

      // Handle AbortSignal
      if (o?.signal) {
        checkAborted(o.signal);
        onAbort = () => {
          hybrid.cancelCall(callId);
        };
        o.signal.addEventListener('abort', onAbort);
        // Note: We should probably remove listener after call completes,
        // but for now this ensures cancellation works.
        // Ideally we wrap the native call in a try/finally to remove listener.
      }

      // Make the call
      try {
        const responseBuffer = await hybrid.unaryCall(
          m,
          requestBuffer as ArrayBuffer,
          metadataJson,
          deadlineMs,
          callId
        );

        const resultBuffer = responseBuffer;
        // Cast to unknown first to safely cast to expected return type
        return deserializer(resultBuffer) as unknown as Res;
      } finally {
        if (o?.signal && onAbort) {
          o.signal.removeEventListener('abort', onAbort);
        }
      }
    }
  );
}

/**
 * Makes a synchronous unary call.
 */
export function unaryCallSync<Req, Res>(
  hybrid: HybridGrpcClient,
  method: string | MethodDefinition<Req, Res>,
  request: Req,
  options?: GrpcCallOptions
): Res {
  const methodName = typeof method === 'string' ? method : method.path;
  const serializer =
    typeof method === 'object' ? method.requestSerialize : serializeMessage;
  const deserializer =
    typeof method === 'object'
      ? method.responseDeserialize
      : deserializeMessage;

  const buffer = serializer(request);
  const requestBuffer = buffer instanceof Uint8Array ? buffer.buffer : buffer;
  const metadata = options?.metadata || new GrpcMetadata();
  const metadataJson = JSON.stringify(metadata.toJSON());
  const deadlineMs = toAbsoluteDeadline(options?.deadline);

  const responseBuffer = hybrid.unaryCallSync(
    methodName,
    requestBuffer as ArrayBuffer,
    metadataJson,
    deadlineMs
  );

  return deserializer(responseBuffer) as Res;
}

/**
 * Helper to apply unary interceptors.
 */
async function applyUnaryInterceptors<Req, Res>(
  interceptors: GrpcInterceptor[],
  method: string,
  request: Req,
  options: GrpcCallOptions | undefined,
  finalCall: (m: string, r: Req, o: GrpcCallOptions) => Promise<Res>
): Promise<Res> {
  const unaryInterceptors = interceptors
    .map((i) => i.unary)
    .filter((i): i is UnaryInterceptor => i !== undefined);

  if (unaryInterceptors.length === 0) {
    return finalCall(method, request, options || {});
  }

  let index = 0;
  const next = async (m: string, r: unknown, o: GrpcCallOptions) => {
    if (index >= unaryInterceptors.length) {
      return finalCall(m, r as Req, o);
    }
    const interceptor = unaryInterceptors[index++];

    return interceptor!(m, r, o, next as unknown as NextUnaryFn);
  };

  return next(method, request, options || {}) as Promise<Res>;
}
