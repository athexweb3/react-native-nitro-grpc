# react-native-nitro-grpc
> **High-performance gRPC for React Native powered by C++ and Nitro Modules.**

[![npm version](https://img.shields.io/npm/v/react-native-nitro-grpc)](https://www.npmjs.com/package/react-native-nitro-grpc)
[![License](https://img.shields.io/github/license/athexweb3/react-native-nitro-grpc)](https://github.com/athexweb3/react-native-nitro-grpc/blob/main/LICENSE)

`react-native-nitro-grpc` brings **Native C++ gRPC** to React Native, offering superior performance, type safety, and true bi-directional streaming compared to REST or `grpc-web`.

## Why `react-native-nitro-grpc`?

*   **Unmatched Performance**: Uses **Protobuf** (30-50% smaller than JSON) and **Zero-Copy Parsing** in C++ to keep your JS thread free.
*   **HTTP/2 & Multiplexing**: One TCP connection for all requests with header compression (HPACK).
*   **True Bi-directional Streaming**: Real-time data flow for chat, trading, and voice apps without WebSockets.
*   **Type Safety**: strict TypeScript definitions generated directly from your `.proto` files.
 
 ## 📦 Android Prefab
 
 > **Note:** Generally you don't need to touch this, but if you are looking for the standalone gRPC C++ for Android:
 
 [![](https://jitpack.io/v/athexweb3/react-native-nitro-grpc.svg)](https://jitpack.io/#athexweb3/react-native-nitro-grpc)
 
 We provide a prebuilt **gRPC Android Prefab** package to speed up build times. It hosts the precompiled static libraries for gRPC Core.
 Check out [packages/grpc-android-prefab](packages/grpc-android-prefab) for more details.

## Installation

```bash
bun install react-native-nitro-grpc
cd ios && bun pods
```

## Usage

### 1. Define your Types
You can use any library to generate TypeScript implementations (like `ts-proto` or `protobufjs`), or define them manually:

```typescript
// Types are just standard TypeScript interfaces!
interface LoginRequest {
  username: string;
  password?: string;
}

interface LoginResponse {
  token: string;
}
```

### 2. Make Requests
Use the `GrpcChannel` and `GrpcClient` to make requests to your server.

```typescript
import { GrpcChannel, GrpcClient, ChannelCredentials } from 'react-native-nitro-grpc';

// 1. Create a Channel
const channel = new GrpcChannel('localhost:50051', ChannelCredentials.createInsecure());

// 2. Create a Client
const client = new GrpcClient(channel);

async function performLogin() {
  try {
    // 3. Make a Call
    const response = await client.unaryCall<LoginRequest, LoginResponse>(
      '/AuthService/Login',
      { username: 'user', password: 'password123' }
    );
    
    console.log('Token:', response.token);
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

### 3. Use Interceptors
Add powerful middleware for logging, retries, and authentication.

```typescript
import { 
  GrpcClient, 
  LoggingInterceptor, 
  RetryInterceptor, 
  GrpcStatus 
} from 'react-native-nitro-grpc';

const client = new GrpcClient(channel, [
  // 1. Retry failed requests (Exponential Backoff)
  new RetryInterceptor({
    maxAttempts: 3,
    initialBackoffMs: 500,
    retryableStatusCodes: [GrpcStatus.UNAVAILABLE],
  }),
  
  // 2. Log requests with redaction
  new LoggingInterceptor({
    sensitiveFields: ['password', 'token'],
    logBody: true,
  }),
]);
```

## Comparison

| Feature | REST | GraphQL | gRPC (`react-native-nitro-grpc`) |
| :--- | :--- | :--- | :--- |
| **Format** | JSON (Text) | JSON (Text) | **Protobuf (Binary)** |
| **Transport** | HTTP/1.1 or 2 | HTTP/1.1 or 2 | **HTTP/2 (Mandatory)** |
| **Streaming** | No | Subscriptions (WS) | **Native Bi-directional** |
| **Type Safety** | Loose | Good | **Strict (Native)** |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

## Contributors

- [Orven Web3](https://github.com/orvenweb3)
- [Athex Web3](https://github.com/athexweb3)
