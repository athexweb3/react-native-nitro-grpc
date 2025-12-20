#include "JsonParser.hpp"

#include <stdexcept>

namespace margelo::nitro::grpc {
namespace JsonParser {

using json = nlohmann::json;

Credentials parseCredentials(const std::string& jsonStr) {
  try {
    auto j = json::parse(jsonStr);

    Credentials creds;

    // Parse type
    std::string typeStr = j.at("type").get<std::string>();
    if (typeStr == "insecure") {
      creds.type = Credentials::Type::INSECURE;
    } else if (typeStr == "ssl") {
      creds.type = Credentials::Type::SSL;
    } else {
      throw std::runtime_error("Invalid credentials type: " + typeStr);
    }

    // Parse optional SSL fields
    if (j.contains("rootCerts") && !j["rootCerts"].is_null()) {
      creds.rootCerts = j["rootCerts"].get<std::string>();
    }

    if (j.contains("privateKey") && !j["privateKey"].is_null()) {
      creds.privateKey = j["privateKey"].get<std::string>();
    }

    if (j.contains("certChain") && !j["certChain"].is_null()) {
      creds.certChain = j["certChain"].get<std::string>();
    }

    if (j.contains("targetNameOverride") && !j["targetNameOverride"].is_null()) {
      creds.targetNameOverride = j["targetNameOverride"].get<std::string>();
    }

    return creds;

  } catch (const json::exception& e) {
    throw std::runtime_error("Failed to parse credentials JSON: " + std::string(e.what()));
  }
}

CallCredentials parseCallCredentials(const std::string& jsonStr) {
  try {
    auto j = json::parse(jsonStr);

    CallCredentials callCreds;

    // Parse type
    std::string typeStr = j.at("type").get<std::string>();
    if (typeStr == "bearer") {
      callCreds.type = CallCredentials::Type::BEARER;
    } else if (typeStr == "oauth2") {
      callCreds.type = CallCredentials::Type::OAUTH2;
    } else if (typeStr == "custom") {
      callCreds.type = CallCredentials::Type::CUSTOM;
    } else {
      throw std::runtime_error("Invalid call credentials type: " + typeStr);
    }

    // Parse token (for Bearer and OAuth2)
    if (j.contains("token") && !j["token"].is_null()) {
      callCreds.token = j["token"].get<std::string>();
    }

    // Parse metadata (for Custom)
    if (j.contains("metadata") && j["metadata"].is_object()) {
      std::map<std::string, std::string> metadata;
      for (auto& [key, value] : j["metadata"].items()) {
        if (value.is_string()) {
          metadata[key] = value.get<std::string>();
        }
      }
      callCreds.metadata = metadata;
    }

    return callCreds;

  } catch (const json::exception& e) {
    throw std::runtime_error("Failed to parse call credentials JSON: " + std::string(e.what()));
  }
}

std::map<std::string, std::string> parseChannelOptions(const std::string& jsonStr) {
  try {
    // Handle empty string
    if (jsonStr.empty() || jsonStr == "{}") {
      return {};
    }

    auto j = json::parse(jsonStr);
    std::map<std::string, std::string> options;

    // Convert all values to strings
    for (auto& [key, value] : j.items()) {
      if (value.is_string()) {
        options[key] = value.get<std::string>();
      } else if (value.is_number_integer()) {
        options[key] = std::to_string(value.get<int64_t>());
      } else if (value.is_number_float()) {
        options[key] = std::to_string(value.get<double>());
      } else if (value.is_boolean()) {
        options[key] = value.get<bool>() ? "1" : "0";
      }
      // Skip null and complex types
    }

    return options;

  } catch (const json::exception& e) {
    throw std::runtime_error("Failed to parse channel options JSON: " + std::string(e.what()));
  }
}

std::map<std::string, std::vector<std::string>> parseMetadata(const std::string& jsonStr) {
  try {
    // Handle empty string
    if (jsonStr.empty() || jsonStr == "{}") {
      return {};
    }

    auto j = json::parse(jsonStr);
    std::map<std::string, std::vector<std::string>> metadata;

    for (auto& [key, value] : j.items()) {
      std::vector<std::string> values;

      if (value.is_array()) {
        for (auto& item : value) {
          if (item.is_string()) {
            values.push_back(item.get<std::string>());
          }
        }
      } else if (value.is_string()) {
        values.push_back(value.get<std::string>());
      }

      if (!values.empty()) {
        metadata[key] = values;
      }
    }

    return metadata;

  } catch (const json::exception& e) {
    throw std::runtime_error("Failed to parse metadata JSON: " + std::string(e.what()));
  }
}

} // namespace JsonParser
} // namespace margelo::nitro::grpc
