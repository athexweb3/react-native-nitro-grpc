#pragma once

#include "HybridGrpcClientSpec.hpp"
#include <NitroModules/ArrayBuffer.hpp>
#include <NitroModules/Promise.hpp>
#include <future>
#include <grpcpp/grpcpp.h>
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

using namespace margelo::nitro;

class HybridGrpcClient : public HybridGrpcClientSpec {
 public:
  HybridGrpcClient();

  void connect(const std::string& host, bool isInsecure) override;

  std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> unaryCall(const std::string& method,
                                                                   const std::shared_ptr<ArrayBuffer>& data) override;

 private:
  std::shared_ptr<grpc::Channel> _channel;
};

} // namespace margelo::nitro::grpc
