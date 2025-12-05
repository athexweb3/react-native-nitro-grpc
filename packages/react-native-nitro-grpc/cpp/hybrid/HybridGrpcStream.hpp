#pragma once

#include "HybridGrpcStreamSpec.hpp"
#include <NitroModules/ArrayBuffer.hpp>
#include <functional>
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

using namespace margelo::nitro;

class HybridGrpcStream : public HybridGrpcStreamSpec {
public:
  HybridGrpcStream() : HybridGrpcStreamSpec() {}

  void write(const std::shared_ptr<ArrayBuffer> &data) override {
    // TODO: Implement write
  }

  void writesDone() override {
    // TODO: Implement writesDone
  }

  void onData(
      const std::function<void(const std::shared_ptr<ArrayBuffer> & /* data */)>
          &callback) override {
    // TODO: Store callback
  }

  void onEnd(const std::function<void()> &callback) override {
    // TODO: Store callback
  }

  void onError(const std::function<void(const std::string & /* error */)>
                   &callback) override {
    // TODO: Store callback
  }
};

} // namespace margelo::nitro::grpc
