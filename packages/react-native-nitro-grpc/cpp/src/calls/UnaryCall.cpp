#include "UnaryCall.hpp"
#include "../core/CompletionQueueManager.hpp"
#include "../core/metadata/MetadataConverter.hpp"
#include "../utils/error/ErrorHandler.hpp"
#include <chrono>
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

      // Prepare request/response buffers
      std::string requestStr(static_cast<const char*>(request->data()), request->size());
      std::string responseStr;

      // Create generic stub
      auto stub = channel->experimental().NewGenericStub();

      // Execute call
      ::grpc::Status status = stub->CallMethod(&context, method, requestStr, &responseStr);

      if (status.ok()) {
        // Success - copy response to ArrayBuffer
        auto responseBuffer = ArrayBuffer::allocate(responseStr.size());
        std::memcpy(responseBuffer->data(), responseStr.data(), responseStr.size());

        promise->resolve(responseBuffer);
      } else {
        // Error - convert to TypeScript error
        auto error = ErrorHandler::fromStatus(status, context);
        std::string errorMsg = "gRPC Error [" + std::to_string(error.code) + "]: " + error.message;
        promise->reject(std::runtime_error(errorMsg));
      }

    } catch (const std::exception& e) {
      promise->reject(std::runtime_error("Unary call failed: " + std::string(e.what())));
    }
  }).detach();
}

} // namespace margelo::nitro::grpc
