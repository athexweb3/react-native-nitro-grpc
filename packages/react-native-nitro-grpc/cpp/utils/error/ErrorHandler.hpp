#pragma once

#include <grpcpp/grpcpp.h>
#include <string>

namespace margelo::nitro::grpc {

/**
 * @brief Error handling utilities for gRPC operations.
 *
 * Converts grpc::Status to TypeScript-friendly error objects.
 */
namespace ErrorHandler {

/**
 * Error structure to pass to TypeScript
 */
struct GrpcError {
  int code;
  std::string message;
  std::string metadataJson; // Trailing metadata as JSON
};

/**
 * Convert grpc::Status to GrpcError.
 *
 * @param status gRPC status from call
 * @param context Client context (for trailing metadata)
 * @return GrpcError structure
 */
GrpcError fromStatus(const ::grpc::Status& status, ::grpc::ClientContext& context);

/**
 * Convert grpc::Status to GrpcError (without context).
 * Use when context is not available.
 *
 * @param status gRPC status from call
 * @return GrpcError structure (no metadata)
 */
GrpcError fromStatus(const ::grpc::Status& status);

} // namespace ErrorHandler

} // namespace margelo::nitro::grpc
