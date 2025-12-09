/**
 * Base interface for gRPC channel credentials.
 * Credentials determine how the client authenticates and secures the connection.
 */
export interface GrpcChannelCredentials {
  readonly type: 'insecure' | 'ssl';
}

/**
 * Insecure credentials for development/testing.
 * WARNING: No encryption or authentication. Use only in development.
 */
export interface InsecureCredentials extends GrpcChannelCredentials {
  readonly type: 'insecure';
}

/**
 * SSL/TLS credentials for secure connections.
 * Supports custom root certificates, client certificates, and private keys.
 */
export interface SslCredentials extends GrpcChannelCredentials {
  readonly type: 'ssl';

  /**
   * Root CA certificate in PEM format (optional).
   * If not provided, the system's default root certificates are used.
   */
  readonly rootCerts?: string;

  /**
   * Client private key in PEM format (optional).
   * Required for mutual TLS authentication.
   */
  readonly privateKey?: string;

  /**
   * Client certificate chain in PEM format (optional).
   * Required for mutual TLS authentication.
   */
  readonly certChain?: string;
}

/**
 * Helper class for creating channel credentials.
 */
export class ChannelCredentials {
  /**
   * Creates insecure credentials (no encryption).
   * Use only for development/testing.
   *
   * @returns Insecure credentials
   */
  static createInsecure(): InsecureCredentials {
    return { type: 'insecure' };
  }

  /**
   * Creates SSL/TLS credentials.
   *
   * @param rootCerts - Optional root CA certificate (PEM)
   * @param privateKey - Optional client private key (PEM)
   * @param certChain - Optional client certificate chain (PEM)
   * @returns SSL credentials
   */
  static createSsl(
    rootCerts?: string,
    privateKey?: string,
    certChain?: string
  ): SslCredentials {
    return {
      type: 'ssl',
      rootCerts,
      privateKey,
      certChain,
    };
  }

  /**
   * Serializes credentials to JSON for C++ bridge.
   *
   * @internal
   * @param credentials - Channel credentials
   * @returns JSON string
   */
  static toJSON(credentials: GrpcChannelCredentials): string {
    return JSON.stringify(credentials);
  }
}

/**
 * Per-call credentials for authentication.
 * These are applied to individual calls, not to the entire channel.
 *
 * @example
 * ```typescript
 * const callCreds = CallCredentials.createFromMetadata((metadata) => {
 *   metadata.add('authorization', 'Bearer token123');
 * });
 * ```
 */
export interface GrpcCallCredentials {
  /**
   * Function that adds authentication metadata to the call.
   */
  readonly applyMetadata: (
    metadata: import('./metadata').GrpcMetadata
  ) => void | Promise<void>;
}

/**
 * Helper class for creating call credentials.
 */
export class CallCredentials {
  /**
   * Creates call credentials from a metadata generator function.
   *
   * @param metadataGenerator - Function that applies auth metadata
   * @returns Call credentials
   */
  static createFromMetadata(
    metadataGenerator: (
      metadata: import('./metadata').GrpcMetadata
    ) => void | Promise<void>
  ): GrpcCallCredentials {
    return {
      applyMetadata: metadataGenerator,
    };
  }

  /**
   * Creates call credentials from a static token.
   *
   * @param token - Authentication token
   * @param scheme - Auth scheme (default: 'Bearer')
   * @returns Call credentials
   */
  static createFromToken(
    token: string,
    scheme: string = 'Bearer'
  ): GrpcCallCredentials {
    return {
      applyMetadata: (metadata) => {
        metadata.add('authorization', `${scheme} ${token}`);
      },
    };
  }
}
