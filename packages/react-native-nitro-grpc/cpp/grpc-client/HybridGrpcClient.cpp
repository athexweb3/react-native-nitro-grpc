#include "HybridGrpcClient.hpp"
#include "../auth/CredentialsFactory.hpp" // NEW
#include "../calls/UnaryCall.hpp"
#include "../channel/ChannelManager.hpp"
#include "../grpc-stream/HybridGrpcStream.hpp"
#include "../utils/json/JsonParser.hpp" // NEW
#include <iostream>
#include <stdexcept>

namespace margelo::nitro::grpc {

void HybridGrpcClient::connect(const std::string& target, const std::string& credentialsJson, const std::string& optionsJson) {
  try {
    // Parse options first to get service config
    auto options = JsonParser::parseChannelOptions(optionsJson);
    auto channelArgs = ChannelManager::createChannelArguments(options);

    // Apply Service Config (Retry Policy)
    if (optionsJson.find("serviceConfig") != std::string::npos) {
      auto fullOptions = nlohmann::json::parse(optionsJson);
      if (fullOptions.contains("serviceConfig") && fullOptions["serviceConfig"].is_object()) {
        std::string serviceConfigJson = fullOptions["serviceConfig"].dump();
        channelArgs.SetServiceConfigJSON(serviceConfigJson);
      }
    }

    _channel = ChannelManager::createChannel(target, credentialsJson, optionsJson);
    _closed = false;
  } catch (const std::exception& e) {
    throw std::runtime_error("Failed to connect: " + std::string(e.what()));
  }
}

// NEW: Connect with call credentials (OAuth2/JWT)
void HybridGrpcClient::connectWithCallCredentials(const std::string& target, const std::string& credentialsJson,
                                                  const std::string& optionsJson, const std::string& callCredentialsJson) {
  try {
    // Parse channel and call credentials
    auto channelCreds = JsonParser::parseCredentials(credentialsJson);
    auto callCreds = JsonParser::parseCallCredentials(callCredentialsJson);

    // Create composite credentials based on call credentials type
    std::shared_ptr<::grpc::ChannelCredentials> compositeCreds;

    if (callCreds.type == JsonParser::CallCredentials::Type::BEARER) {
      if (!callCreds.token.has_value()) {
        throw std::runtime_error("Bearer token is missing");
      }
      compositeCreds = CredentialsFactory::createComposite(channelCreds, callCreds.token.value());
    } else if (callCreds.type == JsonParser::CallCredentials::Type::OAUTH2) {
      if (!callCreds.token.has_value()) {
        throw std::runtime_error("OAuth2 access token is missing");
      }
      // Use CredentialsFactory to create OAuth2 composite
      auto channel_creds = (channelCreds.type == JsonParser::Credentials::Type::INSECURE) ? ::grpc::InsecureChannelCredentials() : [&]() {
        ::grpc::SslCredentialsOptions ssl_opts;
        if (channelCreds.rootCerts.has_value())
          ssl_opts.pem_root_certs = channelCreds.rootCerts.value();
        if (channelCreds.privateKey.has_value())
          ssl_opts.pem_private_key = channelCreds.privateKey.value();
        if (channelCreds.certChain.has_value())
          ssl_opts.pem_cert_chain = channelCreds.certChain.value();
        return ::grpc::SslCredentials(ssl_opts);
      }();

      auto call_creds = CredentialsFactory::createAccessToken(callCreds.token.value());
      compositeCreds = ::grpc::CompositeChannelCredentials(channel_creds, call_creds);
    } else if (callCreds.type == JsonParser::CallCredentials::Type::CUSTOM) {
      if (!callCreds.metadata.has_value()) {
        throw std::runtime_error("Custom metadata is missing");
      }
      auto metadata_creds = CredentialsFactory::createCustomMetadata(callCreds.metadata.value());

      auto channel_creds = (channelCreds.type == JsonParser::Credentials::Type::INSECURE) ? ::grpc::InsecureChannelCredentials() : [&]() {
        ::grpc::SslCredentialsOptions ssl_opts;
        if (channelCreds.rootCerts.has_value())
          ssl_opts.pem_root_certs = channelCreds.rootCerts.value();
        if (channelCreds.privateKey.has_value())
          ssl_opts.pem_private_key = channelCreds.privateKey.value();
        if (channelCreds.certChain.has_value())
          ssl_opts.pem_cert_chain = channelCreds.certChain.value();
        return ::grpc::SslCredentials(ssl_opts);
      }();

      compositeCreds = ::grpc::CompositeChannelCredentials(channel_creds, metadata_creds);
    }

    // Parse channel options and create channel
    auto options = JsonParser::parseChannelOptions(optionsJson);
    auto channelArgs = ChannelManager::createChannelArguments(options);

    // Apply Service Config (Retry Policy)
    if (optionsJson.find("serviceConfig") != std::string::npos) {
      auto fullOptions = nlohmann::json::parse(optionsJson);
      if (fullOptions.contains("serviceConfig") && fullOptions["serviceConfig"].is_object()) {
        std::string serviceConfigJson = fullOptions["serviceConfig"].dump();
        channelArgs.SetServiceConfigJSON(serviceConfigJson);
      }
    }

    // Apply SSL target name override if present
    if (channelCreds.targetNameOverride.has_value()) {
      channelArgs.SetSslTargetNameOverride(channelCreds.targetNameOverride.value());
    }

    _channel = ::grpc::CreateCustomChannel(target, compositeCreds, channelArgs);
    _closed = false;

  } catch (const std::exception& e) {
    throw std::runtime_error("Failed to connect with call credentials: " + std::string(e.what()));
  }
}

void HybridGrpcClient::close() {
  _closed = true;
  // Channel will be cleaned up by shared_ptr
  _channel.reset();
}

double HybridGrpcClient::getConnectivityState(bool tryToConnect) {
  if (!_channel) {
    return 4; // SHUTDOWN
  }
  auto state = _channel->GetState(tryToConnect);
  return static_cast<double>(state);
}

std::shared_ptr<Promise<void>> HybridGrpcClient::watchConnectivityState(double lastState, double deadlineMs) {
  auto promise = Promise<void>::create();
  // TODO: Implement watchConnectivityState properly
  promise->reject(std::make_exception_ptr(std::runtime_error("watchConnectivityState not yet implemented")));
  return promise;
}

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridGrpcClient::unaryCall(const std::string& method,
                                                                                   const std::shared_ptr<ArrayBuffer>& request,
                                                                                   const std::string& metadataJson, double deadlineMs,
                                                                                   const std::string& callId) {
  if (_closed || !_channel) {
    auto promise = Promise<std::shared_ptr<ArrayBuffer>>::create();
    promise->reject(std::make_exception_ptr(std::runtime_error("Channel is closed")));
    return promise;
  }

  auto promise = Promise<std::shared_ptr<ArrayBuffer>>::create();
  int64_t deadlineMsInt = static_cast<int64_t>(deadlineMs);

  // Create context
  auto context = std::make_shared<::grpc::ClientContext>();

  // Register call
  {
    std::lock_guard<std::mutex> lock(_registry->mutex);
    _registry->activeCalls[callId] = context;
  }

  // Capture shared_ptr to registry to ensure it outlives HybridGrpcClient if needed
  std::shared_ptr<CallRegistry> registry = _registry;

  UnaryCall::execute(_channel, method, request, metadataJson, deadlineMsInt, promise, context, [registry, callId]() {
    std::lock_guard<std::mutex> lock(registry->mutex);
    registry->activeCalls.erase(callId);
  });

  return promise;
}

std::shared_ptr<ArrayBuffer> HybridGrpcClient::unaryCallSync(const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                                                             const std::string& metadata, double deadline) {
  if (_closed || !_channel) {
    throw std::runtime_error("Channel is closed");
  }

  // Copy data synchronously (safe on JS thread)
  std::vector<char> requestData(request->size());
  std::memcpy(requestData.data(), request->data(), request->size());

  // DIAGNOSTIC CHECKS
  size_t size = request->size();
  if (size != 11) {
    std::cout << "[Native] Sync Call size: " << size << std::endl;
  } else {
    std::cout << "[Native] Sync Call size: 11 (Correct)" << std::endl;
  }

  int64_t deadlineMsInt = static_cast<int64_t>(deadline);
  auto context = std::make_shared<::grpc::ClientContext>();
  return UnaryCall::perform(_channel, method, requestData, metadata, deadlineMsInt, context);
}

void HybridGrpcClient::cancelCall(const std::string& callId) {
  std::lock_guard<std::mutex> lock(_registry->mutex);
  auto it = _registry->activeCalls.find(callId);
  if (it != _registry->activeCalls.end()) {
    it->second->TryCancel();
  }
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createServerStream(const std::string& method,
                                                                           const std::shared_ptr<ArrayBuffer>& request,
                                                                           const std::string& metadataJson, double deadline) {
  if (_closed || !_channel) {
    throw std::runtime_error("Channel is closed");
  }

  // Create and return the stream
  auto stream = std::make_shared<HybridGrpcStream>();

  // Initialize the stream with channel and start reading
  stream->initServerStream(_channel, method, request, metadataJson, static_cast<int64_t>(deadline), false);

  return stream;
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createServerStreamSync(const std::string& method,
                                                                               const std::shared_ptr<ArrayBuffer>& request,
                                                                               const std::string& metadataJson, double deadline) {
  if (_closed || !_channel) {
    throw std::runtime_error("Channel is closed");
  }

  // Sync version uses same implementation as async for now
  // User calls readSync() in a loop instead of callbacks
  auto stream = std::make_shared<HybridGrpcStream>();
  stream->initServerStream(_channel, method, request, metadataJson, static_cast<int64_t>(deadline), true);
  return stream;
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createClientStreamSync(const std::string& method, const std::string& metadataJson,
                                                                               double deadline) {
  if (_closed || !_channel) {
    throw std::runtime_error("Channel is closed");
  }

  auto stream = std::make_shared<HybridGrpcStream>();
  stream->initClientStream(_channel, method, metadataJson, static_cast<int64_t>(deadline), true);
  return stream;
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createBidiStreamSync(const std::string& method, const std::string& metadataJson,
                                                                             double deadline) {
  if (_closed || !_channel) {
    throw std::runtime_error("Channel is closed");
  }

  auto stream = std::make_shared<HybridGrpcStream>();
  stream->initBidiStream(_channel, method, metadataJson, static_cast<int64_t>(deadline), true);
  return stream;
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createClientStream(const std::string& method, const std::string& metadataJson,
                                                                           double deadline) {
  if (_closed || !_channel) {
    throw std::runtime_error("Channel is closed");
  }

  auto stream = std::make_shared<HybridGrpcStream>();
  stream->initClientStream(_channel, method, metadataJson, static_cast<int64_t>(deadline), false);
  return stream;
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createBidiStream(const std::string& method, const std::string& metadataJson,
                                                                         double deadline) {
  if (_closed || !_channel) {
    throw std::runtime_error("Channel is closed");
  }

  auto stream = std::make_shared<HybridGrpcStream>();
  stream->initBidiStream(_channel, method, metadataJson, static_cast<int64_t>(deadline), false);
  return stream;
}

} // namespace margelo::nitro::grpc
