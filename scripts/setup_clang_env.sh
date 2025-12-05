#!/bin/bash

set -e

# Get the directory of this script file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set BUILD_DIR to the packages/react-native-grpc/build directory
BUILD_DIR="$SCRIPT_DIR/../packages/react-native-grpc/build"

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Convert to absolute path
BUILD_DIR="$(cd "$BUILD_DIR" && pwd)"

# Set PKG_DIR to the packages/react-native-grpc directory
PKG_DIR="$SCRIPT_DIR/../packages/react-native-grpc"

# Convert to absolute path
PKG_DIR="$(cd "$PKG_DIR" && pwd)"

# Create a clean CMakeLists.txt for IDE support with explicit lists
cat > "$PKG_DIR/CMakeLists.txt" << 'EOF'
cmake_minimum_required(VERSION 3.10.0)
project(RNGrpc)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Include directories
include_directories(
  "android/src/main/cpp"
  "cpp"
  "build/includes"
  "nitrogen/generated/shared/c++"
  "../../node_modules/react-native/ReactCommon/jsi"
)

# Source files
add_library(RNGrpc STATIC
  android/src/main/cpp/cpp-adapter.cpp
  cpp/GrpcOnLoad.cpp
  cpp/HybridGrpcClient.hpp
  cpp/HybridGrpcStream.hpp
)
EOF

# Generate compile_commands.json (run from package root, build in build dir)
cmake -S "$PKG_DIR" -B "$BUILD_DIR"

# Copy the generated compile_commands.json to the project root
cp "$BUILD_DIR/compile_commands.json" "$PKG_DIR/compile_commands.json"

# Clean up the temporary CMakeLists.txt
# rm "$PKG_DIR/CMakeLists.txt"

echo "Generated compile_commands.json for IDE support"
