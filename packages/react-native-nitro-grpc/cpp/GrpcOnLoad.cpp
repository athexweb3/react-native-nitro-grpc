#include "HybridObjectRegistry.hpp"
#include "src/bridge/HybridGrpcClient.hpp"
#include "src/bridge/HybridGrpcStream.hpp"

namespace margelo::nitro::grpc {

void registerHybridObjects() {
  HybridObjectRegistry::registerHybridObjectConstructor(
      "GrpcClient", []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridGrpcClient>(); });
  HybridObjectRegistry::registerHybridObjectConstructor(
      "GrpcStream", []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridGrpcStream>(); });
}

} // namespace margelo::nitro::grpc
