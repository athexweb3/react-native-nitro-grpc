# gRPC Android Prefab

🚀 **Prebuilt gRPC C++ static libraries for Android, packaged for easy consumption via Prefab.**

This module provides a ["Prefab"](https://google.github.io/prefab/) AAR containing compiled static libraries and headers for **gRPC Core (v1.62.0)** and its dependencies. It is designed to simplify the integration of gRPC C++ into React Native Android modules (specifically `react-native-nitro-grpc`) by eliminating the need to compile the massive gRPC codebase from source during the app build.

## 📦 Contents

This AAR bundles precompiled `static` libraries (`.a`) for the following architectures:
- **arm64-v8a** (Primary target)
 
 > **Note:** Currently `arm64-v8a` is the supported architecture. Other architectures (like `armeabi-v7a`, `x86`, `x86_64`) will be upgraded soon.

### Included Libraries
All libraries are built from source with `NDK 27.1.12297006` and `Android API 24+`:

*   **gRPC** (v1.62.0) - *The core RPC framework*
*   **Protobuf** - *Serialization*
*   **Abseil** (absl) - *C++ Common Libraries*
*   **BoringSSL** - *Crypto/SSL*
*   **re2** - *Regular expressions*
*   **c-ares** - *Async DNS*
*   **zlib** - *Compression*

## 🛠️ Usage

[![](https://jitpack.io/v/athexweb3/react-native-nitro-grpc.svg)](https://jitpack.io/#athexweb3/react-native-nitro-grpc)
 
 ### 1. Add Repository
 Add this to your `repositories` block (e.g., in `settings.gradle` or root `build.gradle`):
 
 ```gradle
 repositories {
     maven { url 'https://jitpack.io' }
 }
 ```
 
 ### 2. Add Dependency
 Add the dependency to your module or app's `build.gradle`:
 
 ```gradle
 dependencies {
     implementation 'com.github.athexweb3.react-native-nitro-grpc:grpc-android-prefab:1.62.0'
 }
 ```

### 3. Consume in CMake
This module uses [Prefab](https://google.github.io/prefab/), so you can simple import it in your `CMakeLists.txt`:

```cmake
find_package(grpc_cpp REQUIRED CONFIG)

target_link_libraries(your_native_lib
    PRIVATE
    grpc_cpp::grpc++
    grpc_cpp::grpc
    # ... other needed targets
)
```

## 🏗️ Building Locally

To build the AAR without the example app:

```bash
cd example/android
./gradlew :grpc-android-prefab:assembleRelease
```

Output: `packages/grpc-android-prefab/build/outputs/aar/grpc-android-prefab-release.aar` (~183MB)

## ❤️ Credits & Acknowledgements

This package automates the complex build process of the following amazing open-source projects:

-   **[gRPC](https://grpc.io)**: The high-performance RPC framework.
-   **[Protocol Buffers](https://protobuf.dev)**: Google's data interchange format.
-   **[Abseil](https://abseil.io)**: Open-source collection of C++ library code from Google.
-   **[BoringSSL](https://boringssl.googlesource.com/boringssl/)**: Fork of OpenSSL designed to meet Google's needs.
-   **[re2](https://github.com/google/re2)**: Fast, safe, thread-friendly regular expression engine.
-   **[c-ares](https://c-ares.org)**: Asynchronous resolver library.
-   **[Zlib](https://zlib.net)**: Massively spiffy yet delicately unobtrusive compression library.

Built using **[React Native Nitro](https://github.com/mrousavy/nitro)** infrastructure.

## ⚖️ License

The build scripts are licensed under this project's license. The included artifacts are subject to their respective open-source licenses (Apache 2.0, BSD, etc.).
