project(grpc)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME grpc)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Define C++ library and add all sources
add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
  ../nitrogen/generated/android/grpcOnLoad.cpp
  ../cpp/core/CompletionQueueManager.cpp
   ../cpp/core/channel/ChannelManager.cpp
   ../cpp/core/metadata/MetadataConverter.cpp
   ../cpp/calls/UnaryCall.cpp
   ../cpp/hybrid/HybridGrpcClient.cpp
   ../cpp/utils/json/JsonParser.cpp
   ../cpp/utils/error/ErrorHandler.cpp
   ../cpp/hybrid/base64/HybridBase64.cpp
   ../cpp/hybrid/sha256/HybridSha256.cpp
   ../cpp/hybrid/gzip/HybridGzip.cpp
   ../cpp/hybrid/uuid/HybridUuid.cpp
 )
 
 # Add Nitrogen specs :)
 include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/grpc+autolinking.cmake)
 
 # Set up local includes
 include_directories(
   "src/main/cpp"
   "../cpp"
   "../cpp/core"
   "../cpp/hybrid"
   "../cpp/calls"
   "../cpp/utils"
   "../cpp/utils/json"
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
