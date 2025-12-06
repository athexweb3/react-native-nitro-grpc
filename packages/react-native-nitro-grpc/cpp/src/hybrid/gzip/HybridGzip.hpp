#pragma once

#include "HybridGzipSpec.hpp"
#include <NitroModules/ArrayBuffer.hpp>
#include <memory>
#include <vector>

namespace margelo::nitro::grpc {

class HybridGzip : public HybridGzipSpec {
 public:
  HybridGzip() : HybridObject(TAG) {}

  std::shared_ptr<ArrayBuffer> gzip(const std::shared_ptr<ArrayBuffer>& data) override;
  std::shared_ptr<ArrayBuffer> ungzip(const std::shared_ptr<ArrayBuffer>& data) override;
};

} // namespace margelo::nitro::grpc
