#include "MetadataConverter.hpp"

#include "../utils/json/JsonParser.hpp"

#include <stdexcept>

namespace margelo::nitro::grpc {
namespace MetadataConverter {

using json = nlohmann::json;

void applyMetadata(const std::string& metadataJson, ::grpc::ClientContext& context) {
  if (metadataJson.empty() || metadataJson == "{}") {
    return; // No metadata to apply
  }

  try {
    auto metadata = JsonParser::parseMetadata(metadataJson);

    for (const auto& [key, values] : metadata) {
      // Add all values for this key
      for (const auto& value : values) {
        context.AddMetadata(key, value);
      }
    }

  } catch (const std::exception& e) {
    throw std::runtime_error("Failed to apply metadata: " + std::string(e.what()));
  }
}

std::string serializeInitialMetadata(const std::multimap<::grpc::string_ref, ::grpc::string_ref>& metadata) {
  json j = json::object();

  // Group values by key
  std::map<std::string, std::vector<std::string>> grouped;
  for (const auto& [key, value] : metadata) {
    std::string keyStr(key.data(), key.size());
    std::string valueStr(value.data(), value.size());
    grouped[keyStr].push_back(valueStr);
  }

  // Convert to JSON
  for (const auto& [key, values] : grouped) {
    j[key] = values;
  }

  return j.dump();
}

std::string serializeTrailingMetadata(const std::multimap<::grpc::string_ref, ::grpc::string_ref>& metadata) {
  // Same implementation as initial metadata
  return serializeInitialMetadata(metadata);
}

} // namespace MetadataConverter
} // namespace margelo::nitro::grpc
