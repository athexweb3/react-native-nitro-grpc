#pragma once

#include "HybridGrpcClientSpec.hpp"
#include <NitroModules/ArrayBuffer.hpp>
#include <NitroModules/Promise.hpp>
#include <grpcpp/grpcpp.h>
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

using namespace margelo::nitro;

class HybridGrpcClient : public HybridGrpcClientSpec {
 public:
  HybridGrpcClient() : HybridObject(TAG) {}

  // Channel management
  void connect(const std::string& target, const std::string& credentialsJson, const std::string& optionsJson) override;

  void close() override;

  double getConnectivityState(bool tryToConnect) override;

  std::shared_ptr<Promise<void>> watchConnectivityState(double lastState, double deadlineMs) override;

  // Unary call
  // Unary call
  std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> unaryCall(const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                                                                   const std::string& metadataJson, double deadlineMs,
                                                                   const std::string& callId) override;

  std::shared_ptr<ArrayBuffer> unaryCallSync(const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                                             const std::string& metadata, double deadline) override;

  void cancelCall(const std::string& callId) override;

  // Streaming (to be implemented)
  std::shared_ptr<HybridGrpcStreamSpec> createServerStream(const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                                                           const std::string& metadataJson, double deadlineMs) override;

  std::shared_ptr<HybridGrpcStreamSpec> createClientStream(const std::string& method, const std::string& metadataJson,
                                                           double deadlineMs) override;

  std::shared_ptr<HybridGrpcStreamSpec> createBidiStream(const std::string& method, const std::string& metadataJson,
                                                         double deadlineMs) override;

  // Sync stream creation
  std::shared_ptr<HybridGrpcStreamSpec> createServerStreamSync(const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                                                               const std::string& metadataJson, double deadlineMs) override;

  std::shared_ptr<HybridGrpcStreamSpec> createClientStreamSync(const std::string& method, const std::string& metadataJson,
                                                               double deadlineMs) override;

  std::shared_ptr<HybridGrpcStreamSpec> createBidiStreamSync(const std::string& method, const std::string& metadataJson,
                                                             double deadlineMs) override;

 private:
  struct CallRegistry {
    std::unordered_map<std::string, std::shared_ptr<::grpc::ClientContext>> activeCalls;
    std::mutex mutex;
  };

  std::shared_ptr<::grpc::Channel> _channel;
  bool _closed = false;
  std::shared_ptr<CallRegistry> _registry = std::make_shared<CallRegistry>();
};

} // namespace margelo::nitro::grpc
