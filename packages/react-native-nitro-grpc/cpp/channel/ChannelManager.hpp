#pragma once

#include "../utils/json/JsonParser.hpp"
#include <grpcpp/grpcpp.h>
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

/**
 * @brief Manages gRPC channel lifecycle and configuration.
 *
 * Centralizes channel creation with credentials and options.
 * Follows singleton pattern for channel reuse.
 */
class ChannelManager {
 public:
  /**
   * Create a channel with credentials and options.
   *
   * @param target Server address (e.g., "localhost:50051")
   * @param credentialsJson Credentials JSON from TypeScript
   * @param optionsJson Channel options JSON from TypeScript
   * @return Shared pointer to gRPC channel
   * @throws std::runtime_error if parsing fails
   */
  static std::shared_ptr<::grpc::Channel> createChannel(const std::string& target, const std::string& credentialsJson,
                                                        const std::string& optionsJson);

  /**
   * Create channel credentials from parsed data.
   *
   * @param creds Parsed credentials structure
   * @return gRPC channel credentials
   */
  static std::shared_ptr<::grpc::ChannelCredentials> createCredentials(const JsonParser::Credentials& creds);

  /**
   * Create channel arguments from options map.
   *
   * @param options Parsed channel options
   * @return gRPC channel arguments
   */
  static ::grpc::ChannelArguments createChannelArguments(const std::map<std::string, std::string>& options);

 private:
};

} // namespace margelo::nitro::grpc
