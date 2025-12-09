import { GrpcError } from '../../types/GrpcError';
import { GrpcStatus } from '../../types/GrpcStatus';
import { GrpcMetadata } from '../../types/metadata';
import { RetryInterceptor } from '../retry';

// Mock setTimeout
jest.useFakeTimers();

describe('RetryInterceptor', () => {
  const mockNext = jest.fn();
  const mockOptions = { metadata: new GrpcMetadata() };

  beforeEach(() => {
    mockNext.mockReset();
  });

  it('passes through successful calls immediately', async () => {
    const interceptor = new RetryInterceptor();
    mockNext.mockResolvedValue('success');

    const result = await interceptor.unary('/test', {}, mockOptions, mockNext);

    expect(result).toBe('success');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error until success', async () => {
    const interceptor = new RetryInterceptor({
      initialBackoffMs: 100,
      backoffMultiplier: 2,
    });

    // Fail twice, then succeed
    mockNext
      .mockRejectedValueOnce(new GrpcError(GrpcStatus.UNAVAILABLE, 'Busy'))
      .mockRejectedValueOnce(new GrpcError(GrpcStatus.UNAVAILABLE, 'Busy'))
      .mockResolvedValue('success');

    const promise = interceptor.unary('/test', {}, mockOptions, mockNext);

    // Fast-forward time for backoffs
    // 1st retry: ~100ms
    await jest.runAllTimersAsync();
    // 2nd retry: ~200ms
    await jest.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(mockNext).toHaveBeenCalledTimes(3);
  });

  it('stops retrying after maxAttempts', async () => {
    const interceptor = new RetryInterceptor({
      maxAttempts: 3,
      initialBackoffMs: 10,
    });

    mockNext.mockRejectedValue(new GrpcError(GrpcStatus.UNAVAILABLE, 'Fail'));

    const promise = interceptor.unary('/test', {}, mockOptions, mockNext);

    // Attach expectation FIRST to catch the rejection (avoids UnhandledPromiseRejectionWarning)
    const expectation = expect(promise).rejects.toThrow('Fail');

    // Fast-forward time to complete all retries
    await jest.runAllTimersAsync();

    await expectation;
    expect(mockNext).toHaveBeenCalledTimes(3);
  });

  it('does not retry on non-retryable status codes', async () => {
    const interceptor = new RetryInterceptor();

    mockNext.mockRejectedValue(
      new GrpcError(GrpcStatus.INVALID_ARGUMENT, 'Bad Args')
    );

    await expect(
      interceptor.unary('/test', {}, mockOptions, mockNext)
    ).rejects.toThrow('Bad Args');

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
