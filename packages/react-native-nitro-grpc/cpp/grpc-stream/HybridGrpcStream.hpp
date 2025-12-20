#pragma once

#include "HybridGrpcStreamSpec.hpp"

#include <NitroModules/ArrayBuffer.hpp>
#include <atomic>
#include <condition_variable>
#include <cstdint>
#include <deque>
#include <functional>
#include <future>
#include <grpcpp/generic/generic_stub.h>
#include <grpcpp/grpcpp.h>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <variant>
#include <vector>

namespace margelo::nitro::grpc {

using namespace margelo::nitro;

class HybridGrpcStream : public HybridGrpcStreamSpec {
public:
  HybridGrpcStream() : HybridObject(TAG) {}
  ~HybridGrpcStream();

  // Initialize server stream
  void initServerStream(std::shared_ptr<::grpc::Channel> channel,
                        const std::string& method,
                        const std::shared_ptr<ArrayBuffer>& request,
                        const std::string& metadataJson,
                        int64_t deadlineMs,
                        bool isSync);

  bool write(const std::shared_ptr<ArrayBuffer>& data) override;
  void pause() override;
  void resume() override;
  void writesDone() override;
  void onData(const std::function<void(const std::shared_ptr<ArrayBuffer>&)>& callback) override;
  void onMetadata(const std::function<void(const std::string&)>& callback) override;
  void onStatus(const std::function<void(double, const std::string&, const std::string&)>& callback) override;
  void onError(const std::function<void(const std::string&)>& callback) override;
  void cancel() override;

  // Sync methods
  std::variant<nitro::NullType, std::shared_ptr<ArrayBuffer>> readSync() override;
  void writeSync(const std::shared_ptr<ArrayBuffer>& data) override;
  std::variant<nitro::NullType, std::shared_ptr<ArrayBuffer>> finishSync() override;

  // Public init methods - called by HybridGrpcClient
  void initClientStream(std::shared_ptr<::grpc::Channel> channel,
                        const std::string& method,
                        const std::string& metadataJson,
                        int64_t deadlineMs,
                        bool isSync);

  void initBidiStream(std::shared_ptr<::grpc::Channel> channel,
                      const std::string& method,
                      const std::string& metadataJson,
                      int64_t deadlineMs,
                      bool isSync);

private:
  void startReading(std::shared_ptr<::grpc::Channel> channel,
                    const std::string& method,
                    const std::vector<char>& requestData);

  // Stream type
  enum class StreamType { SERVER, CLIENT, BIDI };
  StreamType _streamType;

  std::shared_ptr<::grpc::ClientContext> _context;
  std::unique_ptr<::grpc::GenericClientAsyncReaderWriter> _readerWriter;
  ::grpc::CompletionQueue _cq;
  std::thread _readerThread;
  std::atomic<bool> _cancelled{false};
  ::grpc::Status _status;                         // Storage for async Finish status
  ::grpc::ByteBuffer _initialRequestBuffer;       // For server stream request lifetime
  ::grpc::ByteBuffer _readResponseBuffer;         // Persistent buffer for async reads
  ::grpc::ByteBuffer _currentWriteBuffer;         // Persistent buffer for async writes
  std::shared_ptr<ArrayBuffer> _currentWriteData; // Keep data alive during write

  // Flow Control & Write Queue
  std::deque<std::shared_ptr<ArrayBuffer>> _writeQueue;
  std::atomic<bool> _writePending{false};
  std::atomic<bool> _isPaused{false};
  std::atomic<bool> _readPending{false};
  std::recursive_mutex _queueMutex;
  static constexpr size_t HIGH_WATER_MARK = 10; // Simple limit for backpressure

  void flushWriteQueue();

  // Helper for blocking queue
  template <typename T> class BlockingQueue {
  public:
    void push(T value) {
      std::lock_guard<std::mutex> lock(_mutex);
      _queue.push_back(std::move(value));
      _cv.notify_one();
    }

    // Returns nullopt if queue is closed/finished
    std::optional<T> pop() {
      std::unique_lock<std::mutex> lock(_mutex);
      while (_queue.empty() && !_closed) {
        _cv.wait(lock);
      }
      if (_queue.empty() && _closed) {
        return std::nullopt;
      }
      T value = std::move(_queue.front());
      _queue.pop_front();
      return value;
    }

    void close() {
      std::lock_guard<std::mutex> lock(_mutex);
      _closed = true;
      _cv.notify_all();
    }

    void reset() {
      std::lock_guard<std::mutex> lock(_mutex);
      _queue.clear();
      _closed = false;
    }

  private:
    std::deque<T> _queue;
    std::mutex _mutex;
    std::condition_variable _cv;
    bool _closed = false;
  };

  // Sync Buffers
  BlockingQueue<std::shared_ptr<ArrayBuffer>> _readQueue;
  bool _isSync = false;
  std::shared_ptr<std::promise<void>> _writePromise;
  std::shared_ptr<std::promise<void>> _writesDonePromise;
  std::shared_ptr<std::promise<void>> _finishPromise;

  // Thread-safe callback storage
  std::mutex _callbackMutex;
  std::function<void(const std::shared_ptr<ArrayBuffer>&)> _dataCallback;
  std::function<void(const std::string&)> _metadataCallback;
  std::function<void(double, const std::string&, const std::string&)> _statusCallback;
  std::function<void(const std::string&)> _errorCallback;
};

} // namespace margelo::nitro::grpc
