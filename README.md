# react-native-grpc
> **High-performance gRPC for React Native powered by C++ and Nitro Modules.**

[![npm version](https://img.shields.io/npm/v/react-native-grpc)](https://www.npmjs.com/package/react-native-grpc)
[![License](https://img.shields.io/github/license/athexweb3/react-native-grpc)](https://github.com/athexweb3/react-native-grpc/blob/main/LICENSE)

`react-native-grpc` brings **Native C++ gRPC** to React Native, offering superior performance, type safety, and true bi-directional streaming compared to REST or `grpc-web`.

## Why `react-native-grpc`?

*   **🚀 Unmatched Performance**: Uses **Protobuf** (30-50% smaller than JSON) and **Zero-Copy Parsing** in C++ to keep your JS thread free.
*   **⚡ HTTP/2 & Multiplexing**: One TCP connection for all requests with header compression (HPACK).
*   **🔄 True Bi-directional Streaming**: Real-time data flow for chat, trading, and voice apps without WebSockets.
*   **🛡️ Type Safety**: strict TypeScript definitions generated directly from your `.proto` files.

## Installation

```bash
bun install react-native-grpc
cd ios && bun pods
```

## Usage

### 1. Define your Service
Create a `service.proto` file:

```protobuf
syntax = "proto3";

service AuthService {
  rpc Login (LoginRequest) returns (LoginResponse) {}
}

message LoginRequest {
  string username = 1;
  string password = 2;
}

message LoginResponse {
  string token = 1;
}
```

### 2. Generate Code
Run the codegen command to generate TypeScript bindings:

```bash
bun nitro-grpc codegen
```

### 3. Implement in App

```typescript
import { AuthService } from './generated/service';
import { GrpcClient } from 'react-native-grpc';

const grpcClient = new GrpcClient('your-api.com:443');
const client = new AuthService(grpcClient);

async function performLogin() {
  try {
    const response = await client.login({ 
      username: 'user', 
      password: 'password123' 
    });
    console.log('Token:', response.token);
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

## Comparison

| Feature | REST | GraphQL | gRPC (`react-native-grpc`) |
| :--- | :--- | :--- | :--- |
| **Format** | JSON (Text) | JSON (Text) | **Protobuf (Binary)** |
| **Transport** | HTTP/1.1 or 2 | HTTP/1.1 or 2 | **HTTP/2 (Mandatory)** |
| **Streaming** | No | Subscriptions (WS) | **Native Bi-directional** |
| **Type Safety** | Loose | Good | **Strict (Native)** |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
