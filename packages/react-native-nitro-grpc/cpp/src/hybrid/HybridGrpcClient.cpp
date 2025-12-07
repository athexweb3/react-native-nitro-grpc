#include "HybridGrpcClient.hpp"
#include "../calls/UnaryCall.hpp"
#include "../core/channel/ChannelManager.hpp"
#include <iostream>
#include <stdexcept>

namespace margelo::nitro::grpc {

void HybridGrpcClient::connect(const std::string& target, const std::string& credentialsJson, const std::string& optionsJson) {
  try {
    _channel = ChannelManager::createChannel(target, credentialsJson, optionsJson);
    _closed = false;
  } catch (const std::exception& e) {
    throw std::runtime_error("Failed to connect: " + std::string(e.what()));
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
                                                                                   const std::string& metadataJson, double deadlineMs) {
  if (_closed || !_channel) {
    auto promise = Promise<std::shared_ptr<ArrayBuffer>>::create();
    promise->reject(std::make_exception_ptr(std::runtime_error("Channel is closed")));
    return promise;
  }

  auto promise = Promise<std::shared_ptr<ArrayBuffer>>::create();
  int64_t deadlineMsInt = static_cast<int64_t>(deadlineMs);

  UnaryCall::execute(_channel, method, request, metadataJson, deadlineMsInt, promise);

  return promise;
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createServerStream(const std::string& method,
                                                                           const std::shared_ptr<ArrayBuffer>& request,
                                                                           const std::string& metadataJson, double deadline) {
  // TODO: Implement server streaming
  throw std::runtime_error("Server streaming not yet implemented");
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createClientStream(const std::string& method, const std::string& metadataJson,
                                                                           double deadline) {
  // TODO: Implement client streaming
  throw std::runtime_error("Client streaming not yet implemented");
}

std::shared_ptr<HybridGrpcStreamSpec> HybridGrpcClient::createBidiStream(const std::string& method, const std::string& metadataJson,
                                                                         double deadline) {
  // TODO: Implement bidirectional streaming
  throw std::runtime_error("Bidirectional streaming not yet implemented");
}

} // namespace margelo::nitro::grpc
