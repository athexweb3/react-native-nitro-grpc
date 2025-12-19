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

  /**
   * Override the target name used for SSL hostname verification (optional).
   * Use this when the server's certificate Subject Name doesn't match the target hostname.
   *
   * WARNING: Use with caution in production as it bypasses hostname verification.
   * Only use for:
   * - Development/testing with self-signed certificates
   * - Internal services with certificates issued for different names
   *
   * @example
   * ```typescript
   * // Server certificate is issued for "my-service.internal"
   * // but you're connecting to "10.0.0.5:50051"
   * const creds = ChannelCredentials.createSsl(
   *   rootCertsPem,
   *   undefined,
   *   undefined,
   *   'my-service.internal'
   * );
   * ```
   */
  readonly targetNameOverride?: string;
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
   * @param targetNameOverride - Optional target name for SSL hostname verification override
   * @returns SSL credentials
   */
  static createSsl(
    rootCerts?: string,
    privateKey?: string,
    certChain?: string,
    targetNameOverride?: string
  ): SslCredentials {
    return {
      type: 'ssl',
      rootCerts,
      privateKey,
      certChain,
      targetNameOverride,
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

// =============================================================================
// CALL CREDENTIALS (Per-RPC Authentication)
// =============================================================================

/**
 * Metadata-based call credentials (callback approach).
 * Used with CallOptions for per-RPC authentication.
 */
export interface MetadataCallCredentials {
  /**
   * Function that adds authentication metadata to the call.
   */
  readonly applyMetadata: (
    metadata: import('./metadata').GrpcMetadata
  ) => void | Promise<void>;
}

/**
 * Type-based call credentials for OAuth2/JWT/Bearer authentication.
 * Serialized to JSON and passed to C++ for composite credentials.
 */
export type TypedCallCredentials =
  | BearerTokenCredentials
  | OAuth2Credentials
  | CustomCredentials;

/**
 * Union of all call credential types.
 */
export type GrpcCallCredentials =
  | MetadataCallCredentials
  | TypedCallCredentials;

/**
 * Bearer token credentials for JWT, API keys, etc.
 */
export interface BearerTokenCredentials {
  readonly type: 'bearer';
  readonly token: string;
}

/**
 * OAuth2 access token credentials.
 */
export interface OAuth2Credentials {
  readonly type: 'oauth2';
  readonly token: string;
}

/**
 * Custom metadata-based credentials (for advanced use cases).
 */
export interface CustomCredentials {
  readonly type: 'custom';
  readonly metadata: Record<string, string>;
}

/**
 * Helper class for creating call credentials.
 */
export class CallCredentials {
  // ========== Type-based credentials (for channel-level composite) ==========

  /**
   * Creates Bearer token credentials (for JWT, API keys).
   * Used for channel-level authentication with ChannelCredentials.
   *
   * @param token - Bearer token
   * @returns Bearer credentials
   *
   * @example
   * ```typescript
   * const callCreds = CallCredentials.createBearer(jwtToken);
   * client.connect(target, channelCreds, {}, callCreds);
   * ```
   */
  static createBearer(token: string): BearerTokenCredentials {
    return { type: 'bearer', token };
  }

  /**
   * Creates OAuth2 access token credentials.
   * Used for channel-level authentication with ChannelCredentials.
   *
   * @param accessToken - OAuth2 access token
   * @returns OAuth2 credentials
   *
   * @example
   * ```typescript
   * const callCreds = CallCredentials.createOAuth2(accessToken);
   * client.connect(target, channelCreds, {}, callCreds);
   * ```
   */
  static createOAuth2(accessToken: string): OAuth2Credentials {
    return { type: 'oauth2', token: accessToken };
  }

  /**
   * Creates custom metadata credentials.
   * Used for channel-level authentication with ChannelCredentials.
   *
   * @param metadata - Key-value pairs to add as metadata
   * @returns Custom credentials
   *
   * @example
   * ```typescript
   * const callCreds = CallCredentials.createCustom({
   *   'x-api-key': 'secret',
   *   'x-tenant-id': 'tenant-123'
   * });
   * client.connect(target, channelCreds, {}, callCreds);
   * ```
   */
  static createCustom(metadata: Record<string, string>): CustomCredentials {
    return { type: 'custom', metadata };
  }

  // ========== Metadata-based credentials (for per-call options) ==========

  /**
   * Creates metadata-based call credentials from a generator function.
   * Used with GrpcCallOptions for per-RPC authentication.
   *
   * @param metadataGenerator - Function that applies auth metadata
   * @returns Metadata call credentials
   *
   * @example
   * ```typescript
   * const callCreds = CallCredentials.createFromMetadata((metadata) => {
   *   metadata.add('authorization', 'Bearer ' + getToken());
   * });
   *
   * await client.unaryCall(method, request, { credentials: callCreds });
   * ```
   */
  static createFromMetadata(
    metadataGenerator: (
      metadata: import('./metadata').GrpcMetadata
    ) => void | Promise<void>
  ): MetadataCallCredentials {
    return {
      applyMetadata: metadataGenerator,
    };
  }

  /**
   * Creates metadata-based call credentials from a static token.
   * Used with GrpcCallOptions for per-RPC authentication.
   *
   * @param token - Authentication token
   * @param scheme - Auth scheme (default: 'Bearer')
   * @returns Metadata call credentials
   *
   * @example
   * ```typescript
   * const callCreds = CallCredentials.createFromToken(token);
   * await client.unaryCall(method, request, { credentials: callCreds });
   * ```
   */
  static createFromToken(
    token: string,
    scheme: string = 'Bearer'
  ): MetadataCallCredentials {
    return {
      applyMetadata: (metadata: import('./metadata').GrpcMetadata) => {
        metadata.add('authorization', `${scheme} ${token}`);
      },
    };
  }

  // ========== Serialization (internal) ==========

  /**
   * Serializes typed call credentials to JSON for C++ bridge.
   *
   * @internal
   * @param credentials - Typed call credentials
   * @returns JSON string
   */
  static toJSON(credentials: TypedCallCredentials): string {
    return JSON.stringify(credentials);
  }

  /**
   * Type guard to check if credentials are typed (vs metadata-based).
   *
   * @param credentials - Call credentials
   * @returns True if typed credentials
   */
  static isTyped(
    credentials: GrpcCallCredentials
  ): credentials is TypedCallCredentials {
    return 'type' in credentials;
  }
}
