#pragma once

#include <map>
#include <nlohmann/json.hpp>
#include <optional>
#include <string>

namespace margelo::nitro::grpc {

/**
 * @brief JSON parsing utilities for TypeScript bridge.
 *
 * Parses JSON strings from TypeScript into C++ structures.
 * Uses nlohmann/json (header-only library).
 */
namespace JsonParser {

  /**
   * Credentials parsed from TypeScript
   */
  struct Credentials {
    enum class Type { INSECURE, SSL };

    Type type;
    std::optional<std::string> rootCerts;
    std::optional<std::string> privateKey;
    std::optional<std::string> certChain;
    std::optional<std::string> targetNameOverride; // For SSL hostname verification override
  };

  /**
   * Parse credentials JSON from TypeScript.
   *
   * Expected format:
   * {
   *   "type": "insecure" | "ssl",
   *   "rootCerts"?: string,
   *   "privateKey"?: string,
   *   "certChain"?: string,
   *   "targetNameOverride"?: string
   * }
   *
   * @param json JSON string from TypeScript
   * @return Parsed credentials
   * @throws std::runtime_error if JSON is malformed
   */
  Credentials parseCredentials(const std::string& json);

  /**
   * Parse channel options JSON from TypeScript.
   *
   * Expected format:
   * {
   *   "grpc.keepalive_time_ms": 7200000,
   *   "grpc.max_receive_message_length": 4194304,
   *   ...
   * }
   *
   * @param json JSON string from TypeScript
   * @return Map of option key → value (as strings)
   * @throws std::runtime_error if JSON is malformed
   */
  std::map<std::string, std::string> parseChannelOptions(const std::string& json);

  /**
   * Parse metadata JSON from TypeScript.
   *
   * Expected format:
   * {
   *   "authorization": ["Bearer token"],
   *   "x-trace-id": ["abc-123"]
   * }
   *
   * @param json JSON string from TypeScript
   * @return Map of header key → array of values
   * @throws std::runtime_error if JSON is malformed
   */
  std::map<std::string, std::vector<std::string>> parseMetadata(const std::string& json);

} // namespace JsonParser

} // namespace margelo::nitro::grpc
