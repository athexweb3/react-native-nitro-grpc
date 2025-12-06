project(grpc)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME grpc)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Define C++ library and add all sources
add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
  ../../cpp/GrpcOnLoad.cpp
  ../../cpp/src/core/CompletionQueueManager.cpp
  ../../cpp/src/core/channel/ChannelManager.cpp
  ../../cpp/src/core/metadata/MetadataConverter.cpp
  ../../cpp/src/calls/UnaryCall.cpp
  ../../cpp/src/bridge/HybridGrpcClient.cpp
  ../../cpp/src/utils/json/JsonParser.cpp
  ../../cpp/src/utils/error/ErrorHandler.cpp
)

# Add Nitrogen specs :)
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/grpc+autolinking.cmake)

# Set up local includes
include_directories(
  "src/main/cpp"
  "../cpp"
  "../cpp/src"
  "../cpp/src/core"
  "../cpp/src/bridge"
  "../cpp/src/calls"
  "../cpp/src/utils"
  "../cpp/src/utils/json"
)

find_package(grpc REQUIRED CONFIG)

find_library(LOG_LIB log)


# Fetch nlohmann_json
include(FetchContent)
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

# Link all libraries together
target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android
        grpc::grpc++
        nlohmann_json::nlohmann_json
)
