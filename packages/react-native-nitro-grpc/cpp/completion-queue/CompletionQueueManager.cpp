#include "CompletionQueueManager.hpp"

#include <iostream>

namespace margelo::nitro::grpc {

// Static initialization
std::shared_ptr<CompletionQueueManager> CompletionQueueManager::_instance = nullptr;
std::mutex CompletionQueueManager::_mutex;

std::shared_ptr<CompletionQueueManager> CompletionQueueManager::Instance() {
  std::lock_guard<std::mutex> lock(_mutex);
  if (_instance == nullptr) {
    _instance = std::shared_ptr<CompletionQueueManager>(new CompletionQueueManager());
    _instance->Start();
  }
  return _instance;
}

CompletionQueueManager::CompletionQueueManager() {
  _completionQueue = std::make_shared<::grpc::CompletionQueue>();
}

CompletionQueueManager::~CompletionQueueManager() {
  Stop();
}

std::shared_ptr<::grpc::CompletionQueue> CompletionQueueManager::GetQueue() {
  return _completionQueue;
}

void CompletionQueueManager::Start() {
  if (_isRunning)
    return;

  _isRunning = true;
  _backgroundThread = std::make_unique<std::thread>(&CompletionQueueManager::RunLoop, this);
}

void CompletionQueueManager::Stop() {
  if (!_isRunning)
    return;

  _isRunning = false;

  // Shutdown the queue to wake up the Next() loop
  if (_completionQueue) {
    _completionQueue->Shutdown();
  }

  // Join the thread
  if (_backgroundThread && _backgroundThread->joinable()) {
    _backgroundThread->join();
  }
}

void CompletionQueueManager::RunLoop() {
  void* tag;
  bool ok;

  // The Core Loop: Polls for events (blocking on this background thread)
  // Next() returns false when the queue is fully drained and shut down.
  while (_completionQueue->Next(&tag, &ok)) {
    // If we have a tag, it's a pointer to an executable task (Reactor Pattern)
    // We assume the tag conforms to a common interface (e.g. Runnable)
    if (tag != nullptr) {
      // TODO: In Phase 3, we will define the 'Tag' interface for Calls/Streams.
      // For now, we just print or ignore.
      // auto* runnable = static_cast<GrpcTag*>(tag);
      // runnable->Proceed(ok);
      std::cout << "[CompletionQueueManager] Received event. OK=" << ok << std::endl;
    }
  }
}

} // namespace margelo::nitro::grpc
