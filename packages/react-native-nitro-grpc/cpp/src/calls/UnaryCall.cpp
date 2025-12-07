#include "UnaryCall.hpp"
#include "../core/CompletionQueueManager.hpp"
#include "../core/metadata/MetadataConverter.hpp"
#include "../utils/error/ErrorHandler.hpp"
#include <chrono>
#include <grpcpp/impl/client_unary_call.h>
#include <grpcpp/impl/rpc_method.h>
#include <grpcpp/support/byte_buffer.h>
#include <iostream>

namespace margelo::nitro::grpc {

void UnaryCall::execute(std::shared_ptr<::grpc::Channel> channel, const std::string& method, const std::shared_ptr<ArrayBuffer>& request,
                        const std::string& metadataJson, int64_t deadlineMs,
                        std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> promise) {
  // Execute async in detached thread to avoid blocking
  std::thread([=]() {
    try {
      // Create context
      ::grpc::ClientContext context;

      // Apply metadata
      MetadataConverter::applyMetadata(metadataJson, context);

      // Set deadline if provided
      if (deadlineMs > 0) {
        auto deadline = std::chrono::system_clock::now() + std::chrono::milliseconds(deadlineMs);
        context.set_deadline(deadline);
      }

      // Convert ArrayBuffer to ByteBuffer
      ::grpc::Slice requestSlice(reinterpret_cast<const char*>(request->data()), request->size());
      ::grpc::ByteBuffer requestBuffer(&requestSlice, 1);

      // Prepare response buffer
      ::grpc::ByteBuffer responseBuffer;

      // Create RPC method
      ::grpc::internal::RpcMethod rpcMethod(method.c_str(),
                                            nullptr, // suffix_for_stats
                                            ::grpc::internal::RpcMethod::NORMAL_RPC);

      // Execute blocking unary call
      ::grpc::Status status = ::grpc::internal::BlockingUnaryCall(channel.get(), rpcMethod, &context, requestBuffer, &responseBuffer);

      if (status.ok()) {
        // Success - convert ByteBuffer to ArrayBuffer
        std::vector<::grpc::Slice> slices;
        auto dumpStatus = responseBuffer.Dump(&slices);

        if (!dumpStatus.ok()) {
          promise->reject(std::make_exception_ptr(std::runtime_error("Failed to read response buffer")));
          return;
        }

        // Calculate total size
        size_t totalSize = 0;
        for (const auto& slice : slices) {
          totalSize += slice.size();
        }

        // Allocate and copy data
        auto result = ArrayBuffer::allocate(totalSize);
        size_t offset = 0;
        for (const auto& slice : slices) {
          std::memcpy(static_cast<uint8_t*>(result->data()) + offset, reinterpret_cast<const uint8_t*>(slice.begin()), slice.size());
          offset += slice.size();
        }

        promise->resolve(result);
      } else {
        // Error - convert to TypeScript error
        auto error = ErrorHandler::fromStatus(status, context);
        std::string errorMsg = "gRPC Error [" + std::to_string(error.code) + "]: " + error.message;
        promise->reject(std::make_exception_ptr(std::runtime_error(errorMsg)));
      }

    } catch (const std::exception& e) {
      promise->reject(std::make_exception_ptr(std::runtime_error("Unary call failed: " + std::string(e.what()))));
    }
  }).detach();
}

} // namespace margelo::nitro::grpc
