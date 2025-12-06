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

  // Unary call
  std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> unaryCall(const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                                                                   const std::string& metadataJson, double deadline) override;

  // Streaming (to be implemented)
  std::shared_ptr<HybridGrpcStreamSpec> createServerStream(const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                                                           const std::string& metadataJson, double deadline) override;

  std::shared_ptr<HybridGrpcStreamSpec> createClientStream(const std::string& method, const std::string& metadataJson,
                                                           double deadline) override;

  std::shared_ptr<HybridGrpcStreamSpec> createBidiStream(const std::string& method, const std::string& metadataJson,
                                                         double deadline) override;

 private:
  std::shared_ptr<::grpc::Channel> _channel;
  bool _closed = false;
};

} // namespace margelo::nitro::grpc
