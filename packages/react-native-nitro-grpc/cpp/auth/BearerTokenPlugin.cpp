#include "BearerTokenPlugin.hpp"

namespace margelo::nitro::grpc {

BearerTokenPlugin::BearerTokenPlugin(const std::string& token) : _staticToken(token), _useProvider(false) {}

BearerTokenPlugin::BearerTokenPlugin(std::function<std::string()> tokenProvider)
    : _tokenProvider(std::move(tokenProvider)), _useProvider(true) {}

::grpc::Status BearerTokenPlugin::GetMetadata(::grpc::string_ref service_url, ::grpc::string_ref method_name,
                                              const ::grpc::AuthContext& channel_auth_context,
                                              std::multimap<::grpc::string, ::grpc::string>* metadata) {
  try {
    // Get token (static or from provider)
    std::string token = _useProvider ? _tokenProvider() : _staticToken;

    if (token.empty()) {
      return ::grpc::Status(::grpc::StatusCode::UNAUTHENTICATED, "Bearer token is empty");
    }

    // Add Authorization header with Bearer token
    metadata->insert(std::make_pair("authorization", "Bearer " + token));

    return ::grpc::Status::OK;

  } catch (const std::exception& e) {
    return ::grpc::Status(::grpc::StatusCode::INTERNAL, "Failed to get Bearer token: " + std::string(e.what()));
  }
}

} // namespace margelo::nitro::grpc
