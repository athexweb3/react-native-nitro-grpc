#pragma once

#include "HybridUuidSpec.hpp"
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

class HybridUuid : public HybridUuidSpec {
 public:
  HybridUuid() : HybridObject(TAG) {}

  std::string generate() override;
};

} // namespace margelo::nitro::grpc
