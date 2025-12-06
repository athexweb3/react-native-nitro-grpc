# Coding Conventions

> React Native gRPC Development Standards

This directory contains coding conventions for the React Native gRPC project, covering both TypeScript and C++ development.

## Documents

- **[TypeScript Conventions](./typescript.md)** - Standards for the TypeScript API layer
- **[C++ Conventions](./cpp.md)** - Standards for the native C++ implementation

## Philosophy

This project bridges TypeScript (JS layer) and C++ (native layer) through Nitro Modules. Our conventions merge best practices from both ecosystems while maintaining clear separation of concerns.

### Core Principles

1. **Consistency** - Same patterns throughout codebase
2. **Type Safety** - Leverage type systems (TypeScript & C++)
3. **Clarity** - Self-documenting code
4. **Separation** - Clear boundaries between TS and C++
5. **Performance** - C++ for hot paths, TS for ergonomics
6. **Safety** - Thread-safe, memory-safe, exception-safe

## Quick Reference

### TypeScript

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `GrpcClient` |
| Functions | camelCase | `createMetadata()` |
| Private | _camelCase | `_channel` |
| Constants | SCREAMING_SNAKE | `DEFAULT_TIMEOUT` |
| Files | PascalCase.ts | `GrpcClient.ts` |

### C++

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `ChannelManager` |
| Functions | camelCase | `createChannel()` |
| Members | _camelCase | `_channel` |
| Constants | kPascalCase | `kDefaultTimeout` |
| Files | PascalCase.hpp | `ChannelManager.hpp` |

## Project Structure

```
react-native-nitro-grpc/
├── src/                    # TypeScript source
│   ├── client/            # Client implementation
│   ├── types/             # Type definitions
│   ├── stream/            # Streaming
│   ├── utils/             # Utilities
│   └── specs/             # Nitro specs
│
├── cpp/                    # C++ source
│   ├── include/RNGrpc/    # Public headers
│   └── src/               # Implementation
│       ├── bridge/        # Nitro bridge
│       ├── core/          # Core logic
│       ├── calls/         # RPC implementations
│       └── utils/         # Utilities
│
└── docs/                   # Documentation
    └── conventions/       # This directory
```

## Bridge Layer Conventions

### JSON Serialization

Use camelCase keys (matches TypeScript):

```json
{
  "metadataJson": "...",
  "deadlineMs": 5000,
  "channelOptions": {}
}
```

### Naming Alignment

| TypeScript | C++ |
|------------|-----|
| `GrpcChannel.connect()` | `HybridGrpcClient::connect()` |
| `GrpcClient.unaryCall()` | `HybridGrpcClient::unaryCall()` |
| `GrpcMetadata.toJSON()` | `MetadataConverter::serialize()` |

## Contributing

When contributing code:

1. Follow the conventions in this directory
2. Run linters: `bun lint` (TS) and `clang-format` (C++)
3. Add JSDoc/Doxygen comments for public APIs
4. Write tests for new functionality

## Questions?

For questions about conventions:
- Check detailed docs: [typescript.md](./typescript.md) or [cpp.md](./cpp.md)
- See existing code examples in the codebase
- Ask in team discussions
