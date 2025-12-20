#include "CredentialsFactory.hpp"

namespace margelo::nitro::grpc {

// Helper: Create channel credentials
std::shared_ptr<::grpc::ChannelCredentials>
CredentialsFactory::createChannelCredentials(const JsonParser::Credentials& creds) {
  if (creds.type == JsonParser::Credentials::Type::INSECURE) {
    return ::grpc::InsecureChannelCredentials();
  }

  // SSL credentials
  ::grpc::SslCredentialsOptions ssl_opts;

  if (creds.rootCerts.has_value()) {
    ssl_opts.pem_root_certs = creds.rootCerts.value();
  }

  if (creds.privateKey.has_value()) {
    ssl_opts.pem_private_key = creds.privateKey.value();
  }

  if (creds.certChain.has_value()) {
    ssl_opts.pem_cert_chain = creds.certChain.value();
  }

  return ::grpc::SslCredentials(ssl_opts);
}

// Composite with static token
std::shared_ptr<::grpc::ChannelCredentials>
CredentialsFactory::createComposite(const JsonParser::Credentials& channelCreds, const std::string& token) {
  auto channel_creds = createChannelCredentials(channelCreds);
  auto call_creds = createBearerToken(token);

  return ::grpc::CompositeChannelCredentials(channel_creds, call_creds);
}

// Composite with token provider
std::shared_ptr<::grpc::ChannelCredentials>
CredentialsFactory::createComposite(const JsonParser::Credentials& channelCreds,
                                    std::function<std::string()> tokenProvider) {
  auto channel_creds = createChannelCredentials(channelCreds);
  auto call_creds = createBearerToken(std::move(tokenProvider));

  return ::grpc::CompositeChannelCredentials(channel_creds, call_creds);
}

// Bearer token (static)
std::shared_ptr<::grpc::CallCredentials> CredentialsFactory::createBearerToken(const std::string& token) {
  auto plugin = std::unique_ptr<::grpc::MetadataCredentialsPlugin>(new BearerTokenPlugin(token));

  return ::grpc::MetadataCredentialsFromPlugin(std::move(plugin));
}

// Bearer token (provider)
std::shared_ptr<::grpc::CallCredentials>
CredentialsFactory::createBearerToken(std::function<std::string()> tokenProvider) {
  auto plugin = std::unique_ptr<::grpc::MetadataCredentialsPlugin>(new BearerTokenPlugin(std::move(tokenProvider)));

  return ::grpc::MetadataCredentialsFromPlugin(std::move(plugin));
}

// OAuth2 access token
std::shared_ptr<::grpc::CallCredentials> CredentialsFactory::createAccessToken(const std::string& accessToken) {
  return ::grpc::AccessTokenCredentials(accessToken);
}

// Custom metadata
std::shared_ptr<::grpc::CallCredentials>
CredentialsFactory::createCustomMetadata(const std::map<std::string, std::string>& metadata) {
  // Create a plugin that injects custom metadata
  class CustomMetadataPlugin : public ::grpc::MetadataCredentialsPlugin {
  public:
    explicit CustomMetadataPlugin(std::map<std::string, std::string> meta) : _metadata(std::move(meta)) {}

    ::grpc::Status GetMetadata(::grpc::string_ref,
                               ::grpc::string_ref,
                               const ::grpc::AuthContext&,
                               std::multimap<::grpc::string, ::grpc::string>* metadata) override {
      for (const auto& [key, value] : _metadata) {
        metadata->insert(std::make_pair(key, value));
      }
      return ::grpc::Status::OK;
    }

  private:
    std::map<std::string, std::string> _metadata;
  };

  auto plugin = std::unique_ptr<::grpc::MetadataCredentialsPlugin>(new CustomMetadataPlugin(metadata));

  return ::grpc::MetadataCredentialsFromPlugin(std::move(plugin));
}

} // namespace margelo::nitro::grpc
