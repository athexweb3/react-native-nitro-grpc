#pragma once

#include <atomic>
#include <grpcpp/grpcpp.h>
#include <memory>
#include <mutex>
#include <thread>

namespace margelo::nitro::grpc {

/**
 * @brief Manages the gRPC CompletionQueue and its dedicated background worker thread.
 *
 * This class implements the Reactor pattern for handling async gRPC events.
 * It ensures that all gRPC network IO happens on a background thread, preventing
 * the Reactor Native UI thread (JS) from blocking.
 *
 * Usage:
 * - Call `CompletionQueueManager::Instance()` to access the singleton.
 * - `GetQueue()` returns the shared CompletionQueue for creating calls.
 */
class CompletionQueueManager {
public:
  // Deleted copy constructors for Singleton pattern
  CompletionQueueManager(const CompletionQueueManager&) = delete;
  CompletionQueueManager& operator=(const CompletionQueueManager&) = delete;

  /**
   * @brief Access the Singleton instance.
   * Creates the instance and starts the background thread if not already running.
   */
  static std::shared_ptr<CompletionQueueManager> Instance();

  /**
   * @brief Destructor. Ensures the background thread is stopped cleanly.
   */
  ~CompletionQueueManager();

  /**
   * @brief Gets the underlying gRPC CompletionQueue.
   * Required for initiating any Async gRPC call.
   */
  std::shared_ptr<::grpc::CompletionQueue> GetQueue();

private:
  CompletionQueueManager();

  void Start();
  void Stop();
  void RunLoop();

  std::shared_ptr<::grpc::CompletionQueue> _completionQueue;
  std::unique_ptr<std::thread> _backgroundThread;
  std::atomic<bool> _isRunning{false};

  static std::shared_ptr<CompletionQueueManager> _instance;
  static std::mutex _mutex;
};

} // namespace margelo::nitro::grpc
