/**
 * Validates a gRPC method name format.
 * Valid format: /package.Service/Method or /Service/Method
 *
 * @param method - Method name to validate
 * @returns True if method name is valid
 *
 * @example
 * ```typescript
 * validateMethodName('/myservice.MyService/GetUser') // true
 * validateMethodName('GetUser') // false
 * ```
 */
export function validateMethodName(method: string): boolean {
  // Must start with / and contain at least one more /
  if (!method.startsWith('/') || method.split('/').length < 3) {
    return false;
  }

  // Must not end with /
  if (method.endsWith('/')) {
    return false;
  }

  // Check for invalid characters
  const validPattern = /^\/[\w.]+\/\w+$/;
  return validPattern.test(method);
}

/**
 * Parses a gRPC method name into its components.
 *
 * @param method - Method name to parse
 * @returns Object with service and method names, or null if invalid
 *
 * @example
 * ```typescript
 * parseMethodName('/myservice.MyService/GetUser')
 * // Returns: { service: 'myservice.MyService', method: 'GetUser' }
 * ```
 */
export function parseMethodName(
  method: string
): { service: string; method: string } | null {
  if (!validateMethodName(method)) {
    return null;
  }

  const parts = method.split('/');
  return {
    service: parts[1]!,
    method: parts[2]!,
  };
}

/**
 * Creates a fully qualified gRPC method name.
 *
 * @param service - Service name (e.g., "myservice.MyService")
 * @param method - Method name (e.g., "GetUser")
 * @returns Fully qualified method name
 *
 * @example
 * ```typescript
 * createMethodName('myservice.MyService', 'GetUser')
 * // Returns: '/myservice.MyService/GetUser'
 * ```
 */
export function createMethodName(service: string, method: string): string {
  return `/${service}/${method}`;
}

/**
 * Validates a gRPC server target address.
 *
 * @param target - Target address to validate
 * @returns True if target is valid
 *
 * @example
 * ```typescript
 * validateTarget('localhost:50051') // true
 * validateTarget('dns:///service.example.com') // true
 * validateTarget('invalid') // false
 * ```
 */
export function validateTarget(target: string): boolean {
  // Simple validation: must contain at least one character
  if (!target || target.trim().length === 0) {
    return false;
  }

  // If it starts with a scheme (dns:///,  unix:, etc.), validate that
  if (target.includes('://')) {
    const schemePattern = /^[a-z]+:\/\//;
    return schemePattern.test(target);
  }

  // Otherwise, validate as host:port
  const hostPortPattern = /^[\w.-]+:\d+$/;
  return hostPortPattern.test(target);
}

/**
 * Normalizes a target address by ensuring proper format.
 *
 * @param target - Target address
 * @param defaultPort  - Default port if not specified (default: 443)
 * @returns Normalized target address
 *
 * @example
 * ```typescript
 * normalizeTarget('example.com') // 'example.com:443'
 * normalizeTarget('localhost', 50051) // 'localhost:50051'
 * ```
 */
export function normalizeTarget(
  target: string,
  defaultPort: number = 443
): string {
  // If already has scheme, return as-is
  if (target.includes('://')) {
    return target;
  }

  // If already has port, return as-is
  if (target.includes(':')) {
    return target;
  }

  // Add default port
  return `${target}:${defaultPort}`;
}
