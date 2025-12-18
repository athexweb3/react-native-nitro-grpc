project(grpc)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME grpc)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Define C++ library and add all sources
add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
  ../nitrogen/generated/android/grpcOnLoad.cpp
  ../cpp/src/core/CompletionQueueManager.cpp
  ../cpp/src/core/channel/ChannelManager.cpp
  ../cpp/src/core/metadata/MetadataConverter.cpp
  ../cpp/src/calls/UnaryCall.cpp
  ../cpp/src/hybrid/HybridGrpcClient.cpp
  ../cpp/src/utils/json/JsonParser.cpp
  ../cpp/src/utils/error/ErrorHandler.cpp
  ../cpp/src/hybrid/base64/HybridBase64.cpp
  ../cpp/src/hybrid/sha256/HybridSha256.cpp
  ../cpp/src/hybrid/gzip/HybridGzip.cpp
  ../cpp/src/hybrid/uuid/HybridUuid.cpp
)

# Add Nitrogen specs :)
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/grpc+autolinking.cmake)

# Set up local includes
include_directories(
  "src/main/cpp"
  "../cpp"
  "../cpp/src"
  "../cpp/src/core"
  "../cpp/src/hybrid"
  "../cpp/src/calls"
  "../cpp/src/utils"
  "../cpp/src/utils/json"
)

# Manual Linking of Prefab Artifacts (Bypassing broken find_package)
set(GRPC_PREFAB_DIR "${CMAKE_SOURCE_DIR}/../../grpc-android-prefab/src/main/prefab")
set(GRPC_INCLUDE_DIR "${GRPC_PREFAB_DIR}/modules/grpc_cpp/include")
set(GRPC_LIBS_DIR "${GRPC_PREFAB_DIR}/modules/grpc_cpp/libs/android.${ANDROID_ABI}")

# Check if we have the libs for this ABI
if(NOT EXISTS "${GRPC_LIBS_DIR}")
    message(FATAL_ERROR "gRPC Prefab not found for ABI: ${ANDROID_ABI}. Expected at: ${GRPC_LIBS_DIR}")
endif()

# Include Headers
include_directories(${GRPC_INCLUDE_DIR})

find_library(LOG_LIB log)

# Fetch nlohmann_json
include(FetchContent)
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

# Glob all static libraries
file(GLOB GRPC_STATIC_LIBS "${GRPC_LIBS_DIR}/*.a")

# Link libraries
target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android
        ${GRPC_STATIC_LIBS} # Link all .a files directly
        nlohmann_json::nlohmann_json
        z # Ensure zlib is linked
)
