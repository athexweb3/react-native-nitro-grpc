#pragma once

#include <functional>
#include <grpcpp/security/credentials.h>
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

/**
 * @brief Custom MetadataCredentialsPlugin for Bearer token authentication.
 *
 * This plugin injects a Bearer token into the gRPC metadata for each RPC call.
 * Supports both static tokens and dynamic token providers for automatic refresh.
 */
class BearerTokenPlugin : public ::grpc::MetadataCredentialsPlugin {
 public:
  /**
   * Creates a plugin with a static Bearer token.
   *
   * @param token The Bearer token to use for all RPCs
   */
  explicit BearerTokenPlugin(const std::string& token);

  /**
   * Creates a plugin with a dynamic token provider.
   * The provider is called for each RPC to get a fresh token.
   *
   * @param tokenProvider Function that returns the current token
   */
  explicit BearerTokenPlugin(std::function<std::string()> tokenProvider);

  /**
   * Gets the metadata to attach to an RPC.
   * Called by gRPC for each RPC call.
   *
   * @param service_url The URL of the service being called
   * @param method_name The name of the method being called
   * @param channel_auth_context Authentication context of the channel
   * @param metadata Output map to populate with metadata
   * @return Status indicating success or failure
   */
  ::grpc::Status GetMetadata(::grpc::string_ref service_url, ::grpc::string_ref method_name,
                             const ::grpc::AuthContext& channel_auth_context,
                             std::multimap<::grpc::string, ::grpc::string>* metadata) override;

 private:
  std::string _staticToken;
  std::function<std::string()> _tokenProvider;
  bool _useProvider;
};

} // namespace margelo::nitro::grpc
