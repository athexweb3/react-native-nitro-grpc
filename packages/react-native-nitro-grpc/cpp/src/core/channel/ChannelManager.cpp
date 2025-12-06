#include "ChannelManager.hpp"
#include "../../utils/json/JsonParser.hpp"
#include <stdexcept>

namespace margelo::nitro::grpc {

std::shared_ptr<::grpc::Channel> ChannelManager::createChannel(const std::string& target, const std::string& credentialsJson,
                                                               const std::string& optionsJson) {
  // Parse credentials
  auto creds = JsonParser::parseCredentials(credentialsJson);
  auto grpcCreds = createCredentials(creds);

  // Parse channel options
  auto options = JsonParser::parseChannelOptions(optionsJson);
  auto channelArgs = createChannelArguments(options);

  // Create channel
  return ::grpc::CreateCustomChannel(target, grpcCreds, channelArgs);
}

std::shared_ptr<::grpc::ChannelCredentials> ChannelManager::createCredentials(const JsonParser::Credentials& creds) {
  if (creds.type == JsonParser::Credentials::Type::INSECURE) {
    return ::grpc::InsecureChannelCredentials();
  }

  // SSL/TLS credentials
  ::grpc::SslCredentialsOptions sslOpts;

  if (creds.rootCerts.has_value()) {
    sslOpts.pem_root_certs = creds.rootCerts.value();
  }

  if (creds.privateKey.has_value() && creds.certChain.has_value()) {
    sslOpts.pem_private_key = creds.privateKey.value();
    sslOpts.pem_cert_chain = creds.certChain.value();
  }

  return ::grpc::SslCredentials(sslOpts);
}

::grpc::ChannelArguments ChannelManager::createChannelArguments(const std::map<std::string, std::string>& options) {
  ::grpc::ChannelArguments args;

  for (const auto& [key, value] : options) {
    // Determine if value is int or string based on parsing
    try {
      // Try parsing as int64
      int64_t intVal = std::stoll(value);
      args.SetInt(key, static_cast<int>(intVal));
    } catch (...) {
      // Fall back to string
      args.SetString(key, value);
    }
  }

  return args;
}

} // namespace margelo::nitro::grpc
