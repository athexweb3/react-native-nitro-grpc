#include "HybridGrpcClient.hpp"
#include <grpcpp/grpcpp.h>
#include <iostream>

namespace margelo::nitro::grpc {

HybridGrpcClient::HybridGrpcClient() : HybridGrpcClientSpec() {}

void HybridGrpcClient::connect(const std::string& host, bool isInsecure) {
  std::shared_ptr<grpc::ChannelCredentials> creds;

  if (isInsecure) {
    creds = grpc::InsecureChannelCredentials();
  } else {
    // Basic SSL implementation for now.
    // In strict production apps, we might want to pass root certificates.
    creds = grpc::SslCredentials(grpc::SslCredentialsOptions());
  }

  _channel = grpc::CreateChannel(host, creds);

  // Verify basic connectivity state (optional, just for logging)
  // auto state = _channel->GetState(true);
  // std::cout << "[HybridGrpcClient] Channel created for " << host << std::endl;
}

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridGrpcClient::unaryCall(const std::string& method,
                                                                                   const std::shared_ptr<ArrayBuffer>& data) {
  // Create a Promise
  auto promise = Promise<std::shared_ptr<ArrayBuffer>>::create();

  // TODO: Implement real call using CompletionQueueManager in next step.
  // For now, resolve with empty to keep compiling.
  std::thread([promise]() {
    auto result = std::make_shared<ArrayBuffer>(0);
    promise->resolve(result);
  }).detach();

  return promise;
}

} // namespace margelo::nitro::grpc
