#include "HybridObjectRegistry.hpp"
#include "src/hybrid/HybridGrpcClient.hpp"
#include "src/hybrid/HybridGrpcStream.hpp"
#include "src/hybrid/base64/HybridBase64.hpp"
#include "src/hybrid/gzip/HybridGzip.hpp"
#include "src/hybrid/sha256/HybridSha256.hpp"

namespace margelo::nitro::grpc {

void registerHybridObjects() {
  HybridObjectRegistry::registerHybridObjectConstructor(
      "GrpcClient", []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridGrpcClient>(); });
  HybridObjectRegistry::registerHybridObjectConstructor(
      "GrpcStream", []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridGrpcStream>(); });
  HybridObjectRegistry::registerHybridObjectConstructor("Base64",
                                                        []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridBase64>(); });
  HybridObjectRegistry::registerHybridObjectConstructor("Sha256",
                                                        []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridSha256>(); });
  HybridObjectRegistry::registerHybridObjectConstructor("Gzip",
                                                        []() -> std::shared_ptr<HybridObject> { return std::make_shared<HybridGzip>(); });
}

} // namespace margelo::nitro::grpc
