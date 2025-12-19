#include "ChannelManager.hpp"
#include "../utils/json/JsonParser.hpp"
#include <grpcpp/grpcpp.h>
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

  // Apply SSL target name override if specified
  if (creds.targetNameOverride.has_value()) {
    channelArgs.SetSslTargetNameOverride(creds.targetNameOverride.value());
  }

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
    // Handle integer arguments (most common)
    if (key == "grpc.keepalive_time_ms" || key == "grpc.keepalive_timeout_ms" || key == "grpc.max_receive_message_length" ||
        key == "grpc.max_send_message_length" || key == "grpc.max_concurrent_streams" || key == "grpc.initial_reconnect_backoff_ms" ||
        key == "grpc.max_reconnect_backoff_ms" || key == "grpc.max_connection_age_ms" || key == "grpc.max_connection_age_grace_ms" ||
        key == "grpc.max_connection_idle_ms" || key == "grpc.http2_max_pings_without_data" || key == "grpc.client_idle_timeout_ms" ||
        key == "grpc.dns_min_time_between_resolutions_ms" || key == "grpc.per_rpc_retry_buffer_size" || key == "grpc.retry_buffer_size" ||
        key == "grpc.http2.min_time_between_pings_ms" || key == "grpc.http2.max_ping_strikes" || key == "grpc.http2.write_buffer_size" ||
        key == "grpc.http2.max_frame_size" || key == "grpc.http2.bdp_probe" || key == "grpc.http2.min_ping_interval_without_data_ms" ||
        key == "grpc.max_metadata_size") {
      try {
        int intVal = std::stoi(value);
        args.SetInt(key, intVal);
      } catch (...) {
        // If parsing fails, log and skip
      }
    }
    // Handle boolean/binary arguments (0 or 1)
    else if (key == "grpc.keepalive_permit_without_calls" || key == "grpc.use_local_subchannel_pool" || key == "grpc.enable_http_proxy" ||
             key == "grpc.enable_channelz" || key == "grpc.enable_retries" || key == "grpc.service_config_disable_resolution" ||
             key == "grpc.http2.hpack_table_size.decoder" || key == "grpc.http2.hpack_table_size.encoder") {
      try {
        int boolVal = std::stoi(value);
        args.SetInt(key, boolVal);
      } catch (...) {
        // If parsing fails, log and skip
      }
    }
    // Handle string arguments
    else if (key == "grpc.default_authority" || key == "grpc.primary_user_agent" || key == "grpc.secondary_user_agent" ||
             key == "grpc.service_config" || key == "grpc.lb_policy_name" || key == "grpc.default_compression_algorithm") {
      args.SetString(key, value);
    }
    // Fallback: try int first, then string
    else {
      try {
        int64_t intVal = std::stoll(value);
        args.SetInt(key, static_cast<int>(intVal));
      } catch (...) {
        args.SetString(key, value);
      }
    }
  }

  return args;
}

} // namespace margelo::nitro::grpc
