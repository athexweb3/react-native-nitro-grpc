#pragma once

#include "../utils/json/JsonParser.hpp"
#include "BearerTokenPlugin.hpp"
#include <functional>
#include <grpcpp/security/credentials.h>
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

/**
 * @brief Factory for creating various types of gRPC credentials.
 *
 * Provides methods to create channel credentials, call credentials,
 * and composite credentials (combining both).
 */
class CredentialsFactory {
 public:
  /**
   * Creates composite credentials (Channel + Call credentials).
   * Combines SSL/TLS channel security with per-RPC authentication.
   *
   * @param channelCreds Channel credentials (SSL/Insecure)
   * @param token Bearer token for authentication
   * @return Composite channel credentials
   */
  static std::shared_ptr<::grpc::ChannelCredentials> createComposite(const JsonParser::Credentials& channelCreds, const std::string& token);

  /**
   * Creates composite credentials with a token provider.
   * The provider is called for each RPC to get a fresh token.
   *
   * @param channelCreds Channel credentials (SSL/Insecure)
   * @param tokenProvider Function that returns the current token
   * @return Composite channel credentials
   */
  static std::shared_ptr<::grpc::ChannelCredentials> createComposite(const JsonParser::Credentials& channelCreds,
                                                                     std::function<std::string()> tokenProvider);

  /**
   * Creates call credentials from a Bearer token.
   *
   * @param token Bearer token (JWT, API key, etc.)
   * @return Call credentials
   */
  static std::shared_ptr<::grpc::CallCredentials> createBearerToken(const std::string& token);

  /**
   * Creates call credentials from a token provider.
   *
   * @param tokenProvider Function that returns the current token
   * @return Call credentials
   */
  static std::shared_ptr<::grpc::CallCredentials> createBearerToken(std::function<std::string()> tokenProvider);

  /**
   * Creates OAuth2 access token credentials.
   *
   * @param accessToken OAuth2 access token
   * @return Call credentials
   */
  static std::shared_ptr<::grpc::CallCredentials> createAccessToken(const std::string& accessToken);

  /**
   * Creates call credentials from custom metadata.
   *
   * @param metadata Key-value pairs to add as metadata
   * @return Call credentials
   */
  static std::shared_ptr<::grpc::CallCredentials> createCustomMetadata(const std::map<std::string, std::string>& metadata);

 private:
  /**
   * Helper to create channel credentials from parsed JSON.
   *
   * @param creds Parsed credentials structure
   * @return Channel credentials
   */
  static std::shared_ptr<::grpc::ChannelCredentials> createChannelCredentials(const JsonParser::Credentials& creds);
};

} // namespace margelo::nitro::grpc
