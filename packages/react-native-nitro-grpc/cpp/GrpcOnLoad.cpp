#include "hybrid/HybridGrpcClient.hpp"
#include "hybrid/HybridGrpcStream.hpp"
#include "HybridObjectRegistry.hpp"

namespace margelo::nitro::grpc {

void registerHybridObjects() {
  HybridObjectRegistry::registerHybridObjectConstructor(
      "GrpcClient", []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridGrpcClient>(); });
  HybridObjectRegistry::registerHybridObjectConstructor(
      "GrpcStream", []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridGrpcStream>(); });
}

} // namespace margelo::nitro::grpc
