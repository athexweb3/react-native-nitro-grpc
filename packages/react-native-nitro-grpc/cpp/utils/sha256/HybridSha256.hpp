#pragma once

#include "HybridSha256Spec.hpp"
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

class HybridSha256 : public HybridSha256Spec {
 public:
  HybridSha256() : HybridObject(TAG) {}

  std::string hash(const std::string& data) override;
  std::string hashBytes(const std::shared_ptr<ArrayBuffer>& data) override;

  void loadHybridMethods() override {
    registerHybrids(this, [](Prototype& prototype) {
      prototype.registerHybridMethod("hash", &HybridSha256::hash);
      prototype.registerHybridMethod("hashBytes", &HybridSha256::hashBytes);
    });
  }
};

} // namespace margelo::nitro::grpc
