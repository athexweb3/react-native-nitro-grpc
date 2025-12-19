#pragma once

#include "HybridSha256Spec.hpp"
#include <string>

namespace margelo::nitro::grpc {

class HybridSha256 : public HybridSha256Spec {
 public:
  HybridSha256() : HybridObject(TAG) {}

  std::string hash(const std::string& data) override;
  std::string hashBytes(const std::shared_ptr<ArrayBuffer>& data) override;
};

} // namespace margelo::nitro::grpc
