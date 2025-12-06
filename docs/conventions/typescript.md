# TypeScript Coding Conventions

> React Native gRPC - TypeScript Layer Standards

## File Organization

### Directory Structure

```
src/
├── client/           # Client implementation
│   ├── GrpcClient.ts
│   ├── GrpcChannel.ts
│   └── GrpcCallOptions.ts
│
├── types/            # Type definitions
│   ├── GrpcMetadata.ts
│   ├── GrpcError.ts
│   ├── GrpcCredentials.ts
│   ├── ChannelTypes.ts
│   └── StreamTypes.ts
│
├── stream/           # Streaming implementations
│   └── StreamImplementations.ts
│
├── utils/            # Utility functions
│   ├── errorUtils.ts
│   ├── metadataUtils.ts
│   ├── validationUtils.ts
│   └── index.ts      # Barrel export
│
└── specs/            # Nitro interface definitions
    ├── GrpcClient.nitro.ts
    └── GrpcStream.nitro.ts
```

---

## Naming Conventions

### Classes

use `PascalCase`

```typescript
export class GrpcClient { }
export class GrpcMetadata { }
export class ChannelCredentials { }
```

### Interfaces

use `PascalCase`

```typescript
export interface GrpcCallOptions { }
export interface StatusObject { }
export interface ChannelOptions { }
```

### Functions

use `camelCase`

```typescript
export function createMetadata() { }
export function isGrpcError() { }
function parseMethodName() { }  // internal
```

### Variables

use `camelCase`

```typescript
const metadata = new GrpcMetadata();
let deadlineMs = 5000;
const channelOptions = { ... };
```

### Constants

use `SCREAMING_SNAKE_CASE`

```typescript
export const DEFAULT_TIMEOUT_MS = 30000;
export const MAX_RETRIES = 3;
const INTERNAL_BUFFER_SIZE = 1024;
```

### Enums

`PascalCase` for name, `SCREAMING_SNAKE_CASE` for values

```typescript
export enum ChannelState {
  IDLE = 0,
  CONNECTING = 1,
  READY = 2,
  TRANSIENT_FAILURE = 3,
  SHUTDOWN = 4
}

export enum GrpcStatus {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2
}
```

### Private Members

Prefix with underscore `_camelCase`

```typescript
class GrpcChannel {
  private _hybrid: HybridGrpcClient;
  private _target: string;
  private _closed: boolean = false;
  
  public close() {
    this._closed = true;
  }
}
```

### Type Parameters

Single uppercase letter or `PascalCase`

```typescript
// Generic types
class Stream<T> { }
function parse<TInput, TOutput>(input: TInput): TOutput { }

// Descriptive
class EventEmitter<TEventMap> { }
```

### Files

use `PascalCase.ts` for modules

```
GrpcClient.ts
GrpcMetadata.ts
ChannelTypes.ts
StreamTypes.ts
```

use `camelCase.ts` for utilities

```
errorUtils.ts
metadataUtils.ts
validationUtils.ts
```

---

## File Structure

### Standard Module Order

```typescript
// 1. Third-party imports
import { EventEmitter } from 'eventemitter3';
import { NitroModules } from 'react-native-nitro-modules';

// 2. Local imports (types first, then modules)
import type { GrpcCallOptions } from './types/GrpcCallOptions';
import type { GrpcMetadata } from './types/GrpcMetadata';
import { ChannelCredentials } from './types/GrpcCredentials';

// 3. Type definitions
export interface StatusObject {
  code: number;
  details: string;
  metadata: GrpcMetadata;
}

// 4. Constants
const DEFAULT_TIMEOUT = 30000;

// 5. Class/function implementation
export class GrpcClient {
  // ...
}

// 6. Helper functions (if not exported, place at end)
function internalHelper() {
  // ...
}
```

---

## Type Annotations

### Always Specify Return Types

```typescript
// ✅ Good
export function createMetadata(obj: Record<string, string>): GrpcMetadata {
  const metadata = new GrpcMetadata();
  return metadata;
}

// ❌ Bad - implicit return type
export function createMetadata(obj: Record<string, string>) {
  return new GrpcMetadata();
}
```

### Use Type Inference for Locals

```typescript
// ✅ Good
const metadata = new GrpcMetadata();  // Type inferred
const count = 5;  // Type inferred

// ❌ Unnecessary
const metadata: GrpcMetadata = new GrpcMetadata();
const count: number = 5;
```

### Prefer Type over Interface for Unions

```typescript
// ✅ Good - allows unions
export type GrpcChannelCredentials = InsecureCredentials | SslCredentials;

// Use interface for object shapes
export interface ChannelOptions {
  'grpc.keepalive_time_ms'?: number;
}
```

---

## Documentation

### JSDoc for Public APIs

```typescript
/**
 * Creates a gRPC channel with credentials and options.
 * 
 * @param target - Server address (e.g., "localhost:50051")
 * @param credentials - Channel credentials (secure or insecure)
 * @param options - Optional channel configuration
 * @returns GrpcChannel instance
 * 
 * @example
 * ```typescript
 * const channel = new GrpcChannel(
 *   'localhost:50051',
 *   ChannelCredentials.createInsecure()
 * );
 * ```
 */
constructor(
  target: string,
  credentials: GrpcChannelCredentials,
  options?: ChannelOptions
) {
  // ...
}
```

### Inline Comments for Complex Logic

```typescript
// Convert relative deadline to absolute timestamp
const deadlineMs = deadline instanceof Date
  ? deadline.getTime()
  : Date.now() + deadline;
```

---

## Error Handling

### Use Custom Error Classes

```typescript
export class GrpcError extends Error {
  constructor(
    public readonly code: GrpcStatus,
    public readonly details: string,
    public readonly metadata?: GrpcMetadata
  ) {
    super(`gRPC Error [${GrpcStatus[code]}]: ${details}`);
    this.name = 'GrpcError';
    
    // Set prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, GrpcError.prototype);
  }
}
```

### Provide Type Guards

```typescript
/**
 * Type guard to check if error is a GrpcError.
 */
export function isGrpcError(error: unknown): error is GrpcError {
  return error instanceof GrpcError;
}

// Usage
try {
  await client.unaryCall(...);
} catch (error) {
  if (isGrpcError(error)) {
    console.log(`gRPC error: ${error.code}`);
  }
}
```

---

## Best Practices

### Prefer Readonly Where Possible

```typescript
export interface StatusObject {
  readonly code: number;
  readonly details: string;
  readonly metadata: GrpcMetadata;
}

export class GrpcError {
  public readonly code: GrpcStatus;
  public readonly details: string;
}
```

### Use Strict Null Checks

```typescript
// ✅ Good - explicit optional
function getMetadata(key: string): string | undefined {
  return this._map.get(key)?.[0];
}

// ❌ Bad - returns null
function getMetadata(key: string): string | null {
  return this._map.get(key)?.[0] ?? null;
}
```

### Avoid Any

```typescript
// ❌ Bad
function process(data: any) { }

// ✅ Better - use unknown
function process(data: unknown) {
  if (typeof data === 'string') {
    // TypeScript narrows type here
  }
}

// ✅ Best - use specific types
function process<T>(data: T) { }
```

### Use Optional Chaining

```typescript
// ✅ Good
const value = metadata?.get('key');
const length = array?.length;

// ❌ Verbose
const value = metadata ? metadata.get('key') : undefined;
```

### Use Nullish Coalescing

```typescript
// ✅ Good
const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

// ❌ Bad - doesn't handle 0 correctly
const timeout = options?.timeout || DEFAULT_TIMEOUT;
```

---

## Testing

### File Naming

Place tests next to source files with `.test.ts` suffix

```
src/
├── client/
│   ├── GrpcClient.ts
│   └── GrpcClient.test.ts
└── utils/
    ├── errorUtils.ts
    └── errorUtils.test.ts
```

### Test Structure

```typescript
describe('GrpcMetadata', () => {
  describe('constructor', () => {
    it('should create empty metadata', () => {
      const metadata = new GrpcMetadata();
      expect(metadata.size).toBe(0);
    });
  });
  
  describe('add', () => {
    it('should add key-value pair', () => {
      const metadata = new GrpcMetadata();
      metadata.add('key', 'value');
      expect(metadata.get('key')).toBe('value');
    });
    
    it('should append to existing key', () => {
      const metadata = new GrpcMetadata();
      metadata.add('key', 'value1');
      metadata.add('key', 'value2');
      expect(metadata.getAll('key')).toEqual(['value1', 'value2']);
    });
  });
});
```

---

## Barrel Exports

### utils/index.ts Pattern

```typescript
// utils/index.ts - re-export everything

export * from './errorUtils';
export * from './metadataUtils';
export * from './validationUtils';
export * from './deadlineUtils';
```

### Main index.tsx

Export only public API

```typescript
// src/index.tsx

// Core classes
export { GrpcClient } from './client/GrpcClient';
export { GrpcChannel } from './client/GrpcChannel';
export { GrpcMetadata } from './types/GrpcMetadata';
export { GrpcError } from './types/GrpcError';

// Types
export type { GrpcCallOptions } from './client/GrpcCallOptions';
export type { ChannelOptions, StatusObject } from './types/ChannelTypes';

// Enums
export { ChannelState } from './types/ChannelTypes';
export { GrpcStatus } from './types/GrpcStatus';

// Credentials
export { ChannelCredentials, CallCredentials } from './types/GrpcCredentials';
export type { GrpcChannelCredentials } from './types/GrpcCredentials';

// Utils (selective)
export { createMetadata, isGrpcError } from './utils';
```

---

## Import Order

```typescript
// 1. React/React Native
import { Platform } from 'react-native';

// 2. Third-party packages
import { NitroModules } from 'react-native-nitro-modules';
import { EventEmitter } from 'eventemitter3';

// 3. Type imports (grouped by source)
import type { HybridGrpcClient } from './specs/GrpcClient.nitro';
import type { GrpcMetadata } from './types/GrpcMetadata';
import type { ChannelOptions } from './types/ChannelTypes';

// 4. Local module imports
import { ChannelCredentials } from './types/GrpcCredentials';
import { GrpcError } from './types/GrpcError';
```

---

## Summary

**Key Principles**:
1. **Consistency** - Follow patterns throughout
2. **Type Safety** - Leverage TypeScript's type system
3. **Readability** - Self-documenting code
4. **Maintainability** - Clear structure and organization
5. **Performance** - Efficient implementations
