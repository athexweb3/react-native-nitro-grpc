#!/bin/bash
set -e
cd "$(dirname "$0")"

# Configuration
GRPC_VERSION="v1.62.0" # Match the C++ version we want
ANDROID_NDK_HOME=${ANDROID_NDK_HOME:-$ANDROID_HOME/ndk/27.1.12297006}
CMAKE_BIN=${ANDROID_HOME}/cmake/3.22.1/bin/cmake
NINJA_BIN=${ANDROID_HOME}/cmake/3.22.1/bin/ninja
DIST_DIR="$(pwd)/distribution"
BUILD_DIR="$(pwd)/build_temp"

# Function to build for a specific ABI
build_abi() {
  local ABI=$1
  local API_LEVEL=24
  
  echo "Building for $ABI..."
  
  # Define install path matching Prefab structure
  # src/main/prefab/modules/<module>/libs/android.<abi>/
  local PREFAB_LIB_DIR="$(pwd)/src/main/prefab/modules/grpc_cpp/libs/android.$ABI"
  local PREFAB_INC_DIR="$(pwd)/src/main/prefab/modules/grpc_cpp/include"
  
  mkdir -p "$PREFAB_LIB_DIR"
  mkdir -p "$PREFAB_INC_DIR"

  $CMAKE_BIN -B "$BUILD_DIR/$ABI" -S . \
    -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake" \
    -DANDROID_ABI="$ABI" \
    -DANDROID_PLATFORM="android-$API_LEVEL" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX="$BUILD_DIR/$ABI/install" \
    -DgRPC_INSTALL=ON \
    -DgRPC_BUILD_TESTS=OFF \
    -DgRPC_ABSL_PROVIDER=module \
    -DgRPC_CARES_PROVIDER=module \
    -DgRPC_PROTOBUF_PROVIDER=module \
    -D_gRPC_CPP_PLUGIN_EXECUTABLE="$HOST_INSTALL_DIR/bin/grpc_cpp_plugin" \
    -D_gRPC_CPP_PLUGIN="$HOST_INSTALL_DIR/bin/grpc_cpp_plugin" \
    -DgRPC_CPP_PLUGIN="$HOST_INSTALL_DIR/bin/grpc_cpp_plugin" \
    -D_gRPC_PROTOBUF_PROTOC_EXECUTABLE="$HOST_INSTALL_DIR/bin/protoc" \
    -D_gRPC_PROTOBUF_PROTOC="$HOST_INSTALL_DIR/bin/protoc" \
    -Dprotobuf_PROTOC_EXE="$HOST_INSTALL_DIR/bin/protoc" \
    -DgRPC_RE2_PROVIDER=module \
    -DgRPC_RE2_PROVIDER=module \
    -DgRPC_SSL_PROVIDER=module \
    -DgRPC_ZLIB_PROVIDER=package \
    -DCMAKE_MAKE_PROGRAM=$NINJA_BIN \
    -GNinja

  $CMAKE_BIN --build "$BUILD_DIR/$ABI" --target install
  
  # Copy artifacts to Prefab structure
  cp "$BUILD_DIR/$ABI/install/lib"/*.a "$PREFAB_LIB_DIR/"
  
  # Copy headers (only once, from the first ABI)
  if [ ! -d "$PREFAB_INC_DIR/grpc" ]; then
      cp -r "$BUILD_DIR/$ABI/install/include/"* "$PREFAB_INC_DIR/"
  fi
  
  # Create abi.json for this ABI
  echo "{ \"abi\": \"$ABI\", \"api\": $API_LEVEL, \"ndk\": 27, \"stl\": \"c++_shared\" }" > "$PREFAB_LIB_DIR/abi.json"
}

build_host() {
    echo "Building Host (macOS) tools..."
    mkdir -p "$BUILD_DIR/host"
    
    # Use system cmake or SDK cmake (without toolchain file)
    $CMAKE_BIN -B "$BUILD_DIR/host" -S . \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_OSX_ARCHITECTURES=x86_64 \
        -DCMAKE_INSTALL_PREFIX="$BUILD_DIR/host/install" \
        -DgRPC_INSTALL=ON \
        -DgRPC_BUILD_TESTS=OFF \
        -DgRPC_ABSL_PROVIDER=module \
        -DgRPC_CARES_PROVIDER=module \
        -DgRPC_PROTOBUF_PROVIDER=module \
        -DgRPC_RE2_PROVIDER=module \
        -DgRPC_SSL_PROVIDER=module \
        -DgRPC_ZLIB_PROVIDER=package \
        -DCMAKE_MAKE_PROGRAM=$NINJA_BIN \
        -GNinja

    $CMAKE_BIN --build "$BUILD_DIR/host" --target install
}

# Main Execution
echo "Starting gRPC Android Build..."

# Create module.json
mkdir -p "src/main/prefab/modules/grpc_cpp"
echo '{ "schema_version": 2, "name": "grpc_cpp", "dependencies": [] }' > "src/main/prefab/modules/grpc_cpp/module.json"

# Clone gRPC if not present
if [ ! -d "grpc" ]; then
    git clone --recurse-submodules -b $GRPC_VERSION --depth 1 https://github.com/grpc/grpc.git
fi

cd grpc

# Build Host first to get plugins
HOST_INSTALL_DIR="$BUILD_DIR/host/install"
if [ ! -f "$HOST_INSTALL_DIR/bin/grpc_cpp_plugin" ]; then
    build_host
fi

# Build all ABIs
# Can be reduced to just one for testing speed, but we want a full prefab
# for abi in "arm64-v8a" "armeabi-v7a" "x86" "x86_64"; do
for abi in "arm64-v8a"; do
    # Pass host plugin path to Android build
    export gRPC_CPP_PLUGIN_EXECUTABLE="$HOST_INSTALL_DIR/bin/grpc_cpp_plugin"
    build_abi $abi
done

echo "Build complete! Artifacts in $DIST_DIR"
