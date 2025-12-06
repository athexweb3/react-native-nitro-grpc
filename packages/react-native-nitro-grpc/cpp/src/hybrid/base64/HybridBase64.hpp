#pragma once

#include "HybridBase64Spec.hpp"
#include <memory>
#include <string>
#include <vector>

namespace margelo::nitro::grpc {

class HybridBase64 : public HybridBase64Spec {
 public:
  HybridBase64() : HybridBase64Spec() {}

  std::string encode(const std::shared_ptr<ArrayBuffer>& data) override;
  std::shared_ptr<ArrayBuffer> decode(const std::string& base64) override;
};

} // namespace margelo::nitro::grpc
