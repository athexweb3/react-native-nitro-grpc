#include "UnaryCall.hpp"

#include "../completion-queue/CompletionQueueManager.hpp"
#include "../metadata/MetadataConverter.hpp"
#include "../utils/error/ErrorHandler.hpp"

#include <chrono>
#include <cstdio>
#include <cstring>
#include <grpcpp/generic/generic_stub.h>
#include <grpcpp/impl/client_unary_call.h>
#include <grpcpp/support/byte_buffer.h>
#include <iostream>
#include <vector>

namespace margelo::nitro::grpc {

void UnaryCall::execute(std::shared_ptr<::grpc::Channel> channel,
                        const std::string& method,
                        const std::shared_ptr<ArrayBuffer>& request,
                        const std::string& metadataJson,
                        int64_t deadlineMs,
                        std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> promise,
                        std::shared_ptr<::grpc::ClientContext> context,
                        std::function<void()> onComplete) {
  // Use a shared_ptr for the request copy to handle memory safely across threads if strictly needed,
  // but here we just need to copy the data *before* the thread starts.
  // Actually, 'perform' takes ArrayBuffer. But 'ArrayBuffer' is a JSI object, not thread safe.
  // So 'perform' must take a std::vector<char> instead?
  //
  // Wait, if we want 'perform' to be shared, 'unaryCallSync' works on Main Thread, so it CAN use ArrayBuffer.
  // But 'execute' works on worker thread, so it CANNOT use ArrayBuffer.
  //
  // Solution: 'perform' takes a std::vector<char> (pure C++ data).
  // 'execute' (Async) copies ArrayBuffer -> vector on Main Thread, then passes vector to thread -> perform.
  // 'unaryCallSync' (Sync) copies ArrayBuffer -> vector (safety) -> perform.
  //
  // Let's adjust the Architecture Plan slightly:
  // perform(channel, method, vector<char> requestData, ...)

  // Copy data synchronously on JS Thread
  std::vector<char> requestData(request->size());
  std::memcpy(requestData.data(), request->data(), request->size());

  // DIAGNOSTIC CHECKS (Keep them!)
  size_t size = request->size();
  if (size != 11) {
    // For now we skip check or keep it, up to user
  }

  // Execute async
  std::thread([channel,
               method,
               metadataJson,
               deadlineMs,
               promise,
               requestData = std::move(requestData),
               context,
               onComplete]() {
    try {
      auto result = perform(channel, method, requestData, metadataJson, deadlineMs, context);
      if (onComplete) {
        onComplete();
      }
      promise->resolve(result);
    } catch (const std::exception& e) {
      if (onComplete) {
        onComplete();
      }
      promise->reject(std::make_exception_ptr(std::runtime_error(e.what())));
    }
  }).detach();
}

std::shared_ptr<ArrayBuffer> UnaryCall::perform(std::shared_ptr<::grpc::Channel> channel,
                                                const std::string& method,
                                                const std::vector<char>& requestData,
                                                const std::string& metadataJson,
                                                int64_t deadlineMs,
                                                std::shared_ptr<::grpc::ClientContext> context) {
  // Use GenericStub to match streaming implementation
  ::grpc::GenericStub stub(channel);
  ::grpc::CompletionQueue cq;

  // Apply metadata & deadline
  MetadataConverter::applyMetadata(metadataJson, *context);
  if (deadlineMs > 0) {
    auto deadline = std::chrono::system_clock::now() + std::chrono::milliseconds(deadlineMs);
    context->set_deadline(deadline);
  }

  // Prepare request buffer
  ::grpc::Slice requestSlice(reinterpret_cast<const char*>(requestData.data()), requestData.size());
  ::grpc::ByteBuffer requestBuffer(&requestSlice, 1);
  ::grpc::ByteBuffer responseBuffer;
  ::grpc::Status status;

  std::cerr << "[UnaryCall] Performing call. Method: '" << method << "', PayloadSize: " << requestData.size()
            << std::endl;
  auto state = channel->GetState(true);
  std::cerr << "[UnaryCall] Channel state before call: " << state << std::endl;

  // Prepare the call
  std::unique_ptr<::grpc::GenericClientAsyncReaderWriter> call = stub.PrepareCall(context.get(), method, &cq);

  // Start the call lifecycle
  call->StartCall((void*)1);

  // Do NOT trigger Write/WritesDone here.
  // They must be triggered sequentially in the loop.

  void* tag;
  bool ok;
  bool readDone = false;

  while (cq.Next(&tag, &ok)) {
    if (!ok) {
      auto state = channel->GetState(false);
      std::string err = context->debug_error_string();
      std::string msg = "Failed to start gRPC call. Channel State: " + std::to_string(state) + ", Method: " + method +
                        ", Context Error: " + err;

      std::cerr << "[UnaryCall] " << msg << std::endl;
      throw std::runtime_error(msg);
    }
    // StartCall done -> Write request
    call->Write(requestBuffer, (void*)2);
  }
  else if ((intptr_t)tag == 2) {
    // Write done -> Close writes
    call->WritesDone((void*)3);
  }
  else if ((intptr_t)tag == 3) {
    // WritesDone done -> Read response
    call->Read(&responseBuffer, (void*)4);
  }
  else if ((intptr_t)tag == 4) {
    readDone = ok;
    // Read done -> Finish
    call->Finish(&status, (void*)5);
  }
  else if ((intptr_t)tag == 5) {
    // Finish done -> Exit
    break;
  }
}

if (status.ok()) {
  std::vector<::grpc::Slice> slices;
  if (!responseBuffer.Dump(&slices).ok()) {
    // If empty response (void return?), it might be okay.
    // But usually responseBuffer is valid.
  }

  size_t totalSize = 0;
  for (const auto& slice : slices)
    totalSize += slice.size();

  // Allocate JSI buffer (safe only if on JS thread or using ThreadSafe allocation if available,
  // but assuming existing pattern holds)
  // NOTE: If this runs on BG thread (execute), ArrayBuffer::allocate MIGHT fail if it uses JSI Runtime directly.
  // However, HybridObject methods are invoked from JS, so 'perform' called from 'execute' is on std::thread.
  // If ArrayBuffer requires JS Runtime, we will crash.
  //
  // BUT, the existing Stream implementation uses ArrayBuffer::allocate on '_readerThread' (Background).
  // So ArrayBuffer::allocate IS thread safe in Nitro (uses malloc/standalone JSI or similar).

  auto result = ArrayBuffer::allocate(totalSize);
  size_t offset = 0;
  for (const auto& slice : slices) {
    std::memcpy(static_cast<uint8_t*>(result->data()) + offset, slice.begin(), slice.size());
    offset += slice.size();
  }
  return result;
} else {
  auto error = ErrorHandler::fromStatus(status, *context);
  throw std::runtime_error("gRPC Error [" + std::to_string(error.code) + "]: " + error.message);
}
}

} // namespace margelo::nitro::grpc
