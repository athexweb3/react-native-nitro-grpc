# C++ Coding Conventions

> React Native gRPC - C++ Layer Standards

## File Organization

### Directory Structure

```
cpp/
├── include/RNGrpc/      # Public headers (for library consumers)
│   ├── Config.hpp       # Build configuration
│   └── Types.hpp        # Public type definitions
│
└── src/                 # Implementation (internal)
    ├── bridge/          # Nitro JSI bridge wrappers
    │   ├── HybridGrpcClient.hpp
    │   ├── HybridGrpcClient.cpp
    │   ├── HybridGrpcStream.hpp
    │   └── HybridGrpcStream.cpp
    │
    ├── core/            # Core gRPC logic
    │   ├── channel/     # Channel management
    │   ├── metadata/    # Metadata conversion
    │   └── *.hpp/cpp    # CompletionQueue
    │
    ├── calls/           # RPC implementations
    │   ├── UnaryCall.hpp
    │   ├── ServerStreamCall.hpp
    │   ├── ClientStreamCall.hpp
    │   └── BidiStreamCall.hpp
    │
    └── utils/           # Internal utilities
        ├── json/        # JSON parsing
        ├── error/       # Error handling
        └── threading/   # Thread utilities
```

---

## Naming Conventions

### Classes

use `PascalCase`

```cpp
class ChannelManager { };
class UnaryCall { };
class MetadataConverter { };
```

### Functions

use `camelCase`

```cpp
void createChannel();
std::string parseMetadata();
static void execute();
```

### Member Variables

Prefix with `_camelCase`

```cpp
class ChannelManager {
private:
  std::shared_ptr<grpc::Channel> _channel;
  std::mutex _cacheMutex;
  bool _closed = false;
};
```

### Local Variables

use `camelCase`

```cpp
void execute() {
  auto request = parseRequest();
  std::string metadataJson = "{}";
  int64_t deadlineMs = 5000;
}
```

### Constants

use `kPascalCase` prefix

```cpp
namespace {
  const int kDefaultTimeout = 30000;
  const size_t kMaxBufferSize = 1024;
  constexpr int kMaxRetries = 3;
}
```

### Macros

use `SCREAMING_SNAKE_CASE`

```cpp
#define RNGRPC_LOG(msg) std::cout << msg << std::endl
#define RNGRPC_ASSERT(cond) assert(cond)
```

### Namespaces

use `snake_case`

```cpp
namespace margelo::nitro::grpc {
  // Implementation
}
```

### Files

use `PascalCase.hpp` / `PascalCase.cpp`

```
ChannelManager.hpp
ChannelManager.cpp
UnaryCall.hpp
UnaryCall.cpp
```

---

## File Structure

### Header File (.hpp)

```cpp
#pragma once

// 1. System includes (<>)
#include <memory>
#include <string>
#include <vector>

// 2. Third-party includes (<>)
#include <grpcpp/grpcpp.h>
#include <nlohmann/json.hpp>

// 3. Local includes ("")
#include "../../utils/json/JsonParser.hpp"
#include "../metadata/MetadataConverter.hpp"

namespace margelo::nitro::grpc {

// Forward declarations
class MetadataConverter;

/**
 * @brief Manages gRPC channel lifecycle.
 * 
 * Centralizes channel creation with credentials and options.
 */
class ChannelManager {
public:
  /**
   * @brief Creates a gRPC channel.
   * 
   * @param target Server address
   * @param credentialsJson Credentials as JSON
   * @param optionsJson Channel options as JSON
   * @return Shared pointer to channel
   */
  static std::shared_ptr<::grpc::Channel> createChannel(
    const std::string& target,
    const std::string& credentialsJson,
    const std::string& optionsJson
  );

private:
  static std::shared_ptr<::grpc::ChannelCredentials> 
    createCredentials(const JsonParser::Credentials& creds);
};

} // namespace margelo::nitro::grpc
```

### Implementation File (.cpp)

```cpp
#include "ChannelManager.hpp"

// System includes
#include <stdexcept>

// Third-party
#include <grpcpp/grpcpp.h>

// Local
#include "../../utils/json/JsonParser.hpp"

// Anonymous namespace for internal helpers
namespace {
  bool isValidTarget(const std::string& target) {
    return !target.empty();
  }
}

namespace margelo::nitro::grpc {

std::shared_ptr<::grpc::Channel> ChannelManager::createChannel(
  const std::string& target,
  const std::string& credentialsJson,
  const std::string& optionsJson
) {
  if (!isValidTarget(target)) {
    throw std::runtime_error("Invalid target");
  }
  
  // Implementation...
}

} // namespace margelo::nitro::grpc
```

---

## Include Guards

**Always use `#pragma once`**

```cpp
// ✅ Good
#pragma once

// ❌ Bad - traditional guards
#ifndef CHANNEL_MANAGER_HPP
#define CHANNEL_MANAGER_HPP
// ...
#endif
```

---

## Documentation (Doxygen)

### Class Documentation

```cpp
/**
 * @brief Short description (one line).
 * 
 * Detailed description can span multiple lines.
 * Include important usage notes here.
 */
class ChannelManager {
  // ...
};
```

### Function Documentation

```cpp
/**
 * @brief Creates a gRPC channel.
 * 
 * Parses JSON credentials and options from TypeScript layer.
 * 
 * @param target Server address (e.g., "localhost:50051")
 * @param credentialsJson JSON string with credentials
 * @param optionsJson JSON string with channel options
 * @return Shared pointer to gRPC channel
 * @throws std::runtime_error if parsing fails
 * 
 * @note This function is thread-safe.
 * @see JsonParser::parseCredentials()
 */
static std::shared_ptr<::grpc::Channel> createChannel(
  const std::string& target,
  const std::string& credentialsJson,
  const std::string& optionsJson
);
```

---

## Memory Management

### Use Smart Pointers

```cpp
// ✅ Good
std::shared_ptr<grpc::Channel> _channel;
std::unique_ptr<std::thread> _thread;

// ❌ Bad - raw pointers
grpc::Channel* _channel;
std::thread* _thread;
```

### Use RAII

```cpp
class ChannelManager {
public:
  ChannelManager() {
    // Acquire resources
    _channel = createChannel();
  }
  
  ~ChannelManager() {
    // Cleanup automatic via shared_ptr
  }
  
private:
  std::shared_ptr<grpc::Channel> _channel;
};
```

### Prefer std::move for Transfers

```cpp
// ✅ Good - move semantics
auto buffer = ArrayBuffer::allocate(size);
promise->resolve(std::move(buffer));

// ❌ Bad - unnecessary copy
promise->resolve(buffer);
```

---

## Thread Safety

### Document Thread Assumptions

```cpp
/**
 * @brief Executes unary call asynchronously.
 * 
 * @note This function spawns a detached thread.
 *       DO NOT call from UI thread.
 */
static void execute(...);
```

### Protect Shared State

```cpp
class ChannelManager {
private:
  static std::mutex _cacheMutex;
  static std::map<std::string, std::shared_ptr<Channel>> _cache;
  
public:
  static std::shared_ptr<Channel> getOrCreate(const std::string& key) {
    std::lock_guard<std::mutex> lock(_cacheMutex);
    // Safe access to _cache
    return _cache[key];
  }
};
```

### Use std::atomic for Flags

```cpp
class Worker {
private:
  std::atomic<bool> _isRunning{false};
  
public:
  void start() {
    _isRunning.store(true);
  }
  
  void stop() {
    _isRunning.store(false);
  }
  
  bool isRunning() const {
    return _isRunning.load();
  }
};
```

---

## Error Handling

### Never Throw Across C++/JS Boundary

```cpp
// ✅ Good - catch and convert to promise rejection
void executeCall(std::shared_ptr<Promise<ArrayBuffer>> promise) {
  try {
    // gRPC operations
    auto result = performCall();
    promise->resolve(result);
  } catch (const std::exception& e) {
    promise->reject(std::runtime_error(e.what()));
  }
}

// ❌ Bad - throws to JS
Promise executeCall() {
  if (!channel) {
    throw std::runtime_error("No channel");
  }
  // ...
}
```

### Use Exceptions for Errors

```cpp
// ✅ Good
if (!isValid(input)) {
  throw std::invalid_argument("Invalid input");
}

// ❌ Bad - error codes
int process(Input input) {
  if (!isValid(input)) {
    return -1;  // What does -1 mean?
  }
  return 0;
}
```

---

## Best Practices

### Const Correctness

```cpp
// ✅ Good
class Metadata {
public:
  std::string get(const std::string& key) const {
    return _map.at(key);
  }
  
  void set(const std::string& key, const std::string& value) {
    _map[key] = value;
  }
  
private:
  std::map<std::string, std::string> _map;
};
```

### Use auto Carefully

```cpp
// ✅ Good - obvious types
auto metadata = std::make_shared<GrpcMetadata>();
auto it = map.find(key);

// ❌ Unclear
auto x = getValue();  // What type is x?

// ✅ Better
GrpcStatus status = getValue();
```

### Prefer Range-Based For

```cpp
// ✅ Good
for (const auto& [key, value] : options) {
  args.SetString(key, value);
}

// ❌ Verbose
for (auto it = options.begin(); it != options.end(); ++it) {
  args.SetString(it->first, it->second);
}
```

### Use Structured Bindings

```cpp
// ✅ Good
auto [success, result] = tryParse(json);

// ❌ Verbose
std::pair<bool, Result> p = tryParse(json);
bool success = p.first;
Result result = p.second;
```

### Avoid Unnecessary Copies

```cpp
// ✅ Good - const reference
void process(const std::string& data) {
  // Use data
}

// ❌ Bad - copies string
void process(std::string data) {
  // ...
}
```

---

## Testing

### File Naming

Place tests in `cpp/tests/` with `Test.cpp` suffix

```
cpp/tests/
├── ChannelManagerTest.cpp
├── MetadataConverterTest.cpp
└── JsonParserTest.cpp
```

### Test Structure (Google Test)

```cpp
#include <gtest/gtest.h>
#include "core/channel/ChannelManager.hpp"

namespace margelo::nitro::grpc {
namespace test {

class ChannelManagerTest : public ::testing::Test {
protected:
  void SetUp() override {
    // Common setup
  }
  
  void TearDown() override {
    // Cleanup
  }
};

TEST_F(ChannelManagerTest, CreateChannel_ValidInput_ReturnsChannel) {
  auto channel = ChannelManager::createChannel(
    "localhost:50051",
    R"({"type":"insecure"})",
    "{}"
  );
  
  ASSERT_NE(channel, nullptr);
  EXPECT_TRUE(channel != nullptr);
}

TEST_F(ChannelManagerTest, CreateChannel_InvalidTarget_ThrowsError) {
  EXPECT_THROW(
    ChannelManager::createChannel("", "{}", "{}"),
    std::runtime_error
  );
}

} // namespace test
} // namespace margelo::nitro::grpc
```

---

## CMake Integration

### Target Definition

```cmake
# Source files
file(GLOB_RECURSE SOURCES "src/*.cpp")

# Create library
add_library(RNGrpc SHARED ${SOURCES})

# Include directories
target_include_directories(RNGrpc
  PUBLIC include
  PRIVATE src
)

# Link libraries
target_link_libraries(RNGrpc
  PRIVATE gRPC::grpc++
  PRIVATE nlohmann_json::nlohmann_json
)

# Compiler flags
target_compile_features(RNGrpc PRIVATE cxx_std_17)
target_compile_options(RNGrpc PRIVATE
  $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra>
  $<$<CXX_COMPILER_ID:MSVC>:/W4>
)
```

---

## Summary

**Key Principles**:
1. **Safety** - Memory-safe, thread-safe, exception-safe
2. **Clarity** - Self-documenting code
3. **Performance** - Efficient implementations
4. **Maintainability** - Clear structure
5. **Standards** - Follow modern C++ (C++17+)
