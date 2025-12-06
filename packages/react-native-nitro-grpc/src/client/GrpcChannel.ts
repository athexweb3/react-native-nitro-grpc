import { NitroModules } from 'react-native-nitro-modules';
import type { GrpcClient as HybridGrpcClient } from '../specs/GrpcClient.nitro';
import type { GrpcChannelCredentials } from '../types/GrpcCredentials';
import { ChannelCredentials } from '../types/GrpcCredentials';
import type { ChannelOptions, ChannelState } from '../types/ChannelTypes';

/**
 * Represents a gRPC channel - a connection to a specific server endpoint.
 * Channels are expensive to create, so they should be reused for multiple calls.
 *
 * @example
 * ```typescript
 * const channel = new GrpcChannel(
 *   'localhost:50051',
 *   ChannelCredentials.createInsecure()
 * );
 *
 * // Reuse the channel for multiple clients
 * const client1 = channel.createClient();
 * const client2 = channel.createClient();
 *
 * // Close when done
 * channel.close();
 * ```
 */
export class GrpcChannel {
  private _hybrid: HybridGrpcClient;
  private _target: string;
  private _closed: boolean = false;

  /**
   * Creates a new gRPC channel.
   *
   * @param target - Server address (e.g., "localhost:50051", "dns:///service.example.com")
   * @param credentials - Channel credentials (secure or insecure)
   * @param options - Optional channel configuration
   */
  constructor(
    target: string,
    credentials: GrpcChannelCredentials,
    options?: ChannelOptions
  ) {
    this._target = target;
    this._hybrid =
      NitroModules.createHybridObject<HybridGrpcClient>('GrpcClient');

    const credentialsJson = ChannelCredentials.toJSON(credentials);
    const optionsJson = options ? JSON.stringify(options) : '{}';

    this._hybrid.connect(target, credentialsJson, optionsJson);
  }

  /**
   * Gets the current connectivity state of the channel.
   *
   * @param tryToConnect - If true, attempt to connect if idle
   * @returns Current channel state
   */
  getState(tryToConnect: boolean = false): ChannelState {
    if (this._closed) {
      return 4; // SHUTDOWN
    }
    return this._hybrid.getConnectivityState(tryToConnect) as ChannelState;
  }

  /**
   * Watches for changes in connectivity state.
   *
   * @param currentState - The state to watch from
   * @param deadline - Deadline for the watch operation
   * @param callback - Called when state changes or deadline is reached
   */
  watchConnectivityState(
    currentState: ChannelState,
    deadline: Date,
    callback: (error?: Error) => void
  ): void {
    if (this._closed) {
      callback(new Error('Channel is closed'));
      return;
    }

    const deadlineMs = deadline.getTime();
    this._hybrid
      .watchConnectivityState(currentState, deadlineMs)
      .then(() => callback())
      .catch((error) =>
        callback(error instanceof Error ? error : new Error(String(error)))
      );
  }

  /**
   * Closes the channel and releases all resources.
   * After calling close(), the channel cannot be reused.
   */
  close(): void {
    if (!this._closed) {
      this._hybrid.close();
      this._closed = true;
    }
  }

  /**
   * Checks if the channel is closed.
   *
   * @returns True if channel is closed
   */
  isClosed(): boolean {
    return this._closed;
  }

  /**
   * Gets the target server address.
   *
   * @returns Server address string
   */
  getTarget(): string {
    return this._target;
  }

  /**
   * Creates a new client instance using this channel.
   *
   * @internal
   * @returns Hybrid gRPC client object
   */
  _getHybridClient(): HybridGrpcClient {
    if (this._closed) {
      throw new Error('Cannot create client from closed channel');
    }
    return this._hybrid;
  }
}
