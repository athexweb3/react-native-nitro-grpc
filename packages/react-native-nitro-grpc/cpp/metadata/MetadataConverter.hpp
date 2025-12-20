#pragma once

#include <grpcpp/grpcpp.h>
#include <map>
#include <nlohmann/json.hpp>
#include <string>
#include <vector>

namespace margelo::nitro::grpc {

/**
 * @brief Converts between JSON metadata and grpc::ClientContext.
 *
 * Handles bidirectional conversion for request/response metadata.
 */
namespace MetadataConverter {

/**
 * Apply metadata from JSON to a grpc::ClientContext.
 *
 * @param metadataJson JSON string with metadata map
 * @param context gRPC client context to add metadata to
 * @throws std::runtime_error if JSON is malformed
 */
void applyMetadata(const std::string& metadataJson, ::grpc::ClientContext& context);

/**
 * Serialize grpc metadata headers to JSON string.
 *
 * @param metadata Initial metadata from server
 * @return JSON string representation
 */
std::string serializeInitialMetadata(const std::multimap<::grpc::string_ref, ::grpc::string_ref>& metadata);

/**
 * Serialize trailing metadata to JSON string.
 *
 * @param metadata Trailing metadata from server
 * @return JSON string representation
 */
std::string serializeTrailingMetadata(const std::multimap<::grpc::string_ref, ::grpc::string_ref>& metadata);

} // namespace MetadataConverter

} // namespace margelo::nitro::grpc
