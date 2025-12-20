#include "HybridGrpcStream.hpp"

#include "../metadata/MetadataConverter.hpp"
#include "../utils/error/ErrorHandler.hpp"

#include <grpcpp/support/byte_buffer.h>
#include <iostream>

namespace margelo::nitro::grpc {

using namespace margelo::nitro;

HybridGrpcStream::~HybridGrpcStream() {
  cancel();
  if (_readerThread.joinable()) {
    _readerThread.join();
  }
}

void HybridGrpcStream::flushWriteQueue() {
  std::lock_guard<std::recursive_mutex> lock(_queueMutex);
  if (_writePending)
    return;
  if (_writeQueue.empty())
    return;

  _currentWriteData = _writeQueue.front(); // Keep alive
  _writeQueue.pop_front();
  _writePending = true;

  // Use persistent buffer
  ::grpc::Slice slice(_currentWriteData->data(), _currentWriteData->size());
  _currentWriteBuffer = ::grpc::ByteBuffer(&slice, 1);

  void* tag = nullptr;
  if (_streamType == StreamType::CLIENT)
    tag = (void*)2;
  else if (_streamType == StreamType::BIDI)
    tag = (void*)3;

  if (tag && _readerWriter) {
    _readerWriter->Write(_currentWriteBuffer, tag);
  }
}

void HybridGrpcStream::pause() {
  fprintf(stderr, "[HybridGrpcStream] pause() called! _isPaused -> true\n");
  _isPaused = true;
}

void HybridGrpcStream::resume() {
  fprintf(stderr, "[HybridGrpcStream] resume() called! _isPaused -> false\n");
  bool wasPaused = _isPaused.exchange(false);
  if (wasPaused) {
    bool expected = false;
    if (_readPending.compare_exchange_strong(expected, true)) {
      fprintf(stderr, "[HybridGrpcStream] resume() - triggering new Read\n");
      _readResponseBuffer.Clear();
      void* tag = nullptr;
      if (_streamType == StreamType::BIDI)
        tag = (void*)2;
      else
        tag = (void*)4;

      if (_readerWriter) {
        _readerWriter->Read(&_readResponseBuffer, tag);
      }
    } else {
      fprintf(stderr, "[HybridGrpcStream] resume() - read already pending, no-op\n");
    }
  }
}

// Initialize server stream
void HybridGrpcStream::initServerStream(std::shared_ptr<::grpc::Channel> channel,
                                        const std::string& method,
                                        const std::shared_ptr<ArrayBuffer>& request,
                                        const std::string& metadataJson,
                                        int64_t deadlineMs,
                                        bool isSync) {
  _streamType = StreamType::SERVER;
  _isSync = isSync;
  _context = std::make_shared<::grpc::ClientContext>();

  // Set metadata
  if (!metadataJson.empty()) {
    MetadataConverter::applyMetadata(metadataJson, *_context);
  }

  // Set deadline
  if (deadlineMs > 0) {
    auto deadline = std::chrono::system_clock::now() + std::chrono::milliseconds(deadlineMs);
    _context->set_deadline(deadline);
  }

  // Create ByteBuffer correctly (slice stores pointer, verify lifetime)
  // We copy data to _initialRequestBuffer to ensure lifetime validity for async write
  ::grpc::Slice slice(request->data(), request->size());
  _initialRequestBuffer = ::grpc::ByteBuffer(&slice, 1);

  // Create generic stub
  ::grpc::GenericStub stub(channel);

  // Start async call using ReaderWriter (GenericStub standard)
  _readerWriter = stub.PrepareCall(_context.get(), method, &_cq);
  _readerWriter->StartCall((void*)1);

  // Start background reading thread
  _readerThread = std::thread([this, method]() {
    void* tag;
    bool ok;

    while (_cq.Next(&tag, &ok)) {
      if (!ok && (intptr_t)tag != 5) {
        // If operation failed (and not Finish), likely stream dead or cancelled
        // But we must continue to let Finish cleanup if possible, or break
        // For server stream reading (4), !ok means EOF usually.

        // Tag 1 (StartCall) failing is critical
        if ((intptr_t)tag == 1) {
          std::cerr << "[HybridGrpcStream] StartCall failed for method: " << method
                    << ", Error: " << _context->debug_error_string() << std::endl;
          // Cannot proceed if StartCall failed.
          return;
        }

        if ((intptr_t)tag == 4) {
          // EOF on read, triggers Finish
          _readerWriter->Finish(&_status, (void*)5);
          continue;
        }
        // Other failures
        // logger->log("Operation failed tag: " + std::to_string((intptr_t)tag));
      }

      if ((intptr_t)tag == 1) {
        // StartCall done -> Write request
        _readerWriter->Write(_initialRequestBuffer, (void*)2);
      } else if ((intptr_t)tag == 2) {
        // Write done -> WritesDone (close client side)
        _readerWriter->WritesDone((void*)3);
      } else if ((intptr_t)tag == 3) {
        // WritesDone done -> Start Reading
        _readPending = true;
        _readerWriter->Read(&_readResponseBuffer, (void*)4);
      } else if ((intptr_t)tag == 4) {
        // Read done
        // Read done
        _readPending = false;
        if (ok) {
          // Process message
          std::vector<::grpc::Slice> slices;
          _readResponseBuffer.Dump(&slices);

          size_t totalSize = 0;
          for (const auto& slice : slices)
            totalSize += slice.size();

          auto arrayBuffer = ArrayBuffer::allocate(totalSize);
          size_t offset = 0;
          for (const auto& slice : slices) {
            std::memcpy(static_cast<uint8_t*>(arrayBuffer->data()) + offset, slice.begin(), slice.size());
            offset += slice.size();
          }

          if (_isSync) {
            _readQueue.push(arrayBuffer);
          } else if (_dataCallback) {
            _dataCallback(arrayBuffer);
          }

          // Read next if not paused
          if (_isPaused) {
            // Do not read. Resume will trigger read.
          } else {
            _readPending = true;
            _readResponseBuffer.Clear();
            _readerWriter->Read(&_readResponseBuffer, (void*)4);
          }
        } else {
          // !ok handled above (EOF)
          _readerWriter->Finish(&_status, (void*)5);
        }
      } else if ((intptr_t)tag == 5) {
        // Finish done
        if (_isSync) {
          _readQueue.close();
        } else if (_statusCallback) {
          _statusCallback(static_cast<double>(_status.error_code()), _status.error_message(), "{}");
        }
        break; // End thread
      }
    }
  });
}

std::variant<nitro::NullType, std::shared_ptr<ArrayBuffer>> HybridGrpcStream::readSync() {
  if (!_isSync) {
    throw std::runtime_error("Stream not initialized for synchronous reading.");
  }
  auto result = _readQueue.pop();
  if (result.has_value()) {
    return result.value();
  }
  return nitro::NullType{};
}

// Client Stream Init
void HybridGrpcStream::initClientStream(std::shared_ptr<::grpc::Channel> channel,
                                        const std::string& method,
                                        const std::string& metadataJson,
                                        int64_t deadlineMs,
                                        bool isSync) {
  _streamType = StreamType::CLIENT;
  _isSync = isSync;
  _context = std::make_shared<::grpc::ClientContext>();

  // Set metadata
  if (!metadataJson.empty()) {
    MetadataConverter::applyMetadata(metadataJson, *_context);
  }

  // Set deadline
  if (deadlineMs > 0) {
    auto deadline = std::chrono::system_clock::now() + std::chrono::milliseconds(deadlineMs);
    _context->set_deadline(deadline);
  }

  ::grpc::GenericStub stub(channel);
  _readerWriter = stub.PrepareCall(_context.get(), method, &_cq);
  _readerWriter->StartCall((void*)1);

  // Background thread for handling completion
  _readerThread = std::thread([this]() {
    void* tag;
    bool ok;

    while (_cq.Next(&tag, &ok)) {
      if (!ok && (intptr_t)tag != 5) {
        if ((intptr_t)tag == 4) {
          _readerWriter->Finish(&_status, (void*)5);
          continue;
        }
      }

      if ((intptr_t)tag == 1) {
        // Stream started. Read the response eventually.
        _readPending = true;
        _readerWriter->Read(&_readResponseBuffer, (void*)4);
      } else if ((intptr_t)tag == 2) {
        // Write completed
        _writePending = false;
        flushWriteQueue();

        if (_isSync && _writePromise) {
          _writePromise->set_value();
          // Important: don't clear _writePromise here, let writesDone or writeSync handle lifetime
          // Actually shared_ptr, so safe.
        }
      } else if ((intptr_t)tag == 3) {
        // WritesDone completed
        if (_isSync && _writesDonePromise) {
          _writesDonePromise->set_value();
        }
      } else if ((intptr_t)tag == 4) {
        // Response received
        _readPending = false;
        if (ok) {
          std::vector<::grpc::Slice> slices;
          _readResponseBuffer.Dump(&slices);
          size_t totalSize = 0;
          for (const auto& slice : slices)
            totalSize += slice.size();
          auto arrayBuffer = ArrayBuffer::allocate(totalSize);
          size_t offset = 0;
          for (const auto& slice : slices) {
            std::memcpy(static_cast<uint8_t*>(arrayBuffer->data()) + offset, slice.begin(), slice.size());
            offset += slice.size();
          }

          if (_isSync) {
            _readQueue.push(arrayBuffer);
          } else if (_dataCallback) {
            _dataCallback(arrayBuffer);
          }
        }
        // Always Finish after response (or failure to get response)
        _readerWriter->Finish(&_status, (void*)5);

      } else if ((intptr_t)tag == 5) {
        // Finish completed
        if (_isSync) {
          _readQueue.close();
          if (_finishPromise)
            _finishPromise->set_value();
        } else if (_statusCallback) {
          _statusCallback(static_cast<double>(_status.error_code()), _status.error_message(), "{}");
        }
        break;
      }
    }
  });
}

// Bidi Stream Init
void HybridGrpcStream::initBidiStream(std::shared_ptr<::grpc::Channel> channel,
                                      const std::string& method,
                                      const std::string& metadataJson,
                                      int64_t deadlineMs,
                                      bool isSync) {
  _streamType = StreamType::BIDI;
  _isSync = isSync;
  _context = std::make_shared<::grpc::ClientContext>();

  // Set metadata
  if (!metadataJson.empty()) {
    MetadataConverter::applyMetadata(metadataJson, *_context);
  }

  // Set deadline
  if (deadlineMs > 0) {
    auto deadline = std::chrono::system_clock::now() + std::chrono::milliseconds(deadlineMs);
    _context->set_deadline(deadline);
  }

  ::grpc::GenericStub stub(channel);
  _readerWriter = stub.PrepareCall(_context.get(), method, &_cq);
  _readerWriter->StartCall((void*)1);

  // Background thread for reading
  _readerThread = std::thread([this]() {
    void* tag;
    bool ok;

    while (_cq.Next(&tag, &ok)) {
      if (!ok && (intptr_t)tag != 5) {
        if ((intptr_t)tag == 4) {
          _readerWriter->Finish(&_status, (void*)5);
          continue;
        }
      }

      if ((intptr_t)tag == 1) {
        _readPending = true;
        _readerWriter->Read(&_readResponseBuffer, (void*)2);
      } else if ((intptr_t)tag == 2) {
        // Read completed
        _readPending = false;
        if (ok) {
          std::vector<::grpc::Slice> slices;
          _readResponseBuffer.Dump(&slices);
          size_t totalSize = 0;
          for (const auto& slice : slices)
            totalSize += slice.size();
          auto arrayBuffer = ArrayBuffer::allocate(totalSize);
          size_t offset = 0;
          for (const auto& slice : slices) {
            std::memcpy(static_cast<uint8_t*>(arrayBuffer->data()) + offset, slice.begin(), slice.size());
            offset += slice.size();
          }

          if (_isSync) {
            _readQueue.push(arrayBuffer);
          } else if (_dataCallback) {
            _dataCallback(arrayBuffer);
          }

          if (_isPaused) {
            // Pause
          } else {
            _readPending = true;
            _readResponseBuffer.Clear();
            _readerWriter->Read(&_readResponseBuffer, (void*)2);
          }
        } else {
          // EOF
          _readerWriter->Finish(&_status, (void*)5);
        }
      } else if ((intptr_t)tag == 3) {
        // Write completed
        _writePending = false;
        flushWriteQueue();
        if (_isSync && _writePromise) {
          _writePromise->set_value();
        }
      } else if ((intptr_t)tag == 4) {
        // WritesDone completed
        if (_isSync && _writesDonePromise) {
          _writesDonePromise->set_value();
        }
      } else if ((intptr_t)tag == 5) {
        if (_isSync) {
          _readQueue.close();
          if (_finishPromise)
            _finishPromise->set_value();
        } else if (_statusCallback) {
          _statusCallback(static_cast<double>(_status.error_code()), _status.error_message(), "{}");
        }
        break;
      }
    }
  });
}

bool HybridGrpcStream::write(const std::shared_ptr<ArrayBuffer>& data) {
  if (_streamType == StreamType::SERVER) {
    throw std::runtime_error("Cannot write to server stream");
  }

  std::lock_guard<std::recursive_mutex> lock(_queueMutex);
  _writeQueue.push_back(data);
  bool isBackpressure = _writeQueue.size() >= HIGH_WATER_MARK;

  if (!_writePending) {
    flushWriteQueue();
  }

  return !isBackpressure;
}

void HybridGrpcStream::writesDone() {
  if (_streamType == StreamType::CLIENT && _readerWriter) {
    _readerWriter->WritesDone((void*)3);
  } else if (_streamType == StreamType::BIDI && _readerWriter) {
    _readerWriter->WritesDone((void*)4);
  }
}

void HybridGrpcStream::writeSync(const std::shared_ptr<ArrayBuffer>& data) {
  if (_streamType == StreamType::SERVER) {
    throw std::runtime_error("Cannot write to server stream");
  }
  if (!_isSync)
    throw std::runtime_error("Stream not initialized for synchronous writing.");

  ::grpc::Slice slice(data->data(), data->size());
  ::grpc::ByteBuffer buffer(&slice, 1);

  auto promise = std::make_shared<std::promise<void>>();
  auto future = promise->get_future();
  {
    std::lock_guard<std::mutex> lock(_callbackMutex);
    _writePromise = promise;
  }

  if (_streamType == StreamType::CLIENT && _readerWriter) {
    _readerWriter->Write(buffer, (void*)2);
  } else if (_streamType == StreamType::BIDI && _readerWriter) {
    _readerWriter->Write(buffer, (void*)3);
  }

  // Block until complete
  future.wait();

  {
    std::lock_guard<std::mutex> lock(_callbackMutex);
    _writePromise = nullptr;
  }
}

std::variant<nitro::NullType, std::shared_ptr<ArrayBuffer>> HybridGrpcStream::finishSync() {
  if (_streamType != StreamType::CLIENT) {
    throw std::runtime_error("finishSync only valid for client streams");
  }
  if (!_isSync)
    throw std::runtime_error("Stream not initialized for synchronous usage.");

  auto donePromise = std::make_shared<std::promise<void>>();
  auto doneFuture = donePromise->get_future();
  auto finishPromise = std::make_shared<std::promise<void>>();
  auto finishFuture = finishPromise->get_future();

  {
    std::lock_guard<std::mutex> lock(_callbackMutex);
    _writesDonePromise = donePromise;
    _finishPromise = finishPromise;
  }

  // 1. Signal WritesDone
  _readerWriter->WritesDone((void*)3);
  doneFuture.wait();

  // 2. Wait for response (single read for Client Stream)
  auto result = _readQueue.pop();

  // 3. Wait for Finish (status)
  finishFuture.wait();

  if (_status.ok()) {
    if (result.has_value())
      return result.value();
    return nitro::NullType{};
  } else {
    throw std::runtime_error("gRPC Error: " + _status.error_message());
  }
}

void HybridGrpcStream::onData(const std::function<void(const std::shared_ptr<ArrayBuffer>&)>& callback) {
  std::lock_guard<std::mutex> lock(_callbackMutex);
  _dataCallback = callback;
}

void HybridGrpcStream::onMetadata(const std::function<void(const std::string&)>& callback) {
  std::lock_guard<std::mutex> lock(_callbackMutex);
  _metadataCallback = callback;
}

void HybridGrpcStream::onStatus(const std::function<void(double, const std::string&, const std::string&)>& callback) {
  std::lock_guard<std::mutex> lock(_callbackMutex);
  _statusCallback = callback;
}

void HybridGrpcStream::onError(const std::function<void(const std::string&)>& callback) {
  std::lock_guard<std::mutex> lock(_callbackMutex);
  _errorCallback = callback;
}

void HybridGrpcStream::cancel() {
  bool expected = false;
  if (_cancelled.compare_exchange_strong(expected, true)) {
    if (_context) {
      _context->TryCancel();
    }
    _cq.Shutdown();
  }
}

} // namespace margelo::nitro::grpc
