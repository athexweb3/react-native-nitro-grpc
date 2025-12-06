#pragma once

#include <NitroModules/ArrayBuffer.hpp>
#include <NitroModules/Promise.hpp>
#include <functional>
#include <grpcpp/grpcpp.h>
#include <memory>
#include <string>

namespace margelo::nitro::grpc {

using namespace margelo::nitro;

/**
 * @brief Unary call implementation.
 *
 * Single request → single response RPC pattern.
 * Executes asynchronously using CompletionQueue.
 */
class UnaryCall {
 public:
  /**
   * Execute a unary gRPC call.
   *
   * @param channel gRPC channel to server
   * @param method Fully qualified method name (e.g., "/service.Service/Method")
   * @param request Serialized request data
   * @param metadataJson Request metadata as JSON
   * @param deadlineMs Deadline in milliseconds (0 = no deadline)
   * @param promise Promise to resolve/reject
   */
  static void execute(std::shared_ptr<::grpc::Channel> channel, const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                      const std::string& metadataJson, int64_t deadlineMs, std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> promise);
};

} // namespace margelo::nitro::grpc
