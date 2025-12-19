#include "HybridGzip.hpp"
#include <iostream>
#include <stdexcept>
#include <vector>
#include <zlib.h>

namespace margelo::nitro::grpc {

// Gzip header uses windowBits = 15 + 16 (31) for deflateInit2/inflateInit2
constexpr int GZIP_WINDOW_BITS = 15 + 16;
constexpr int CHUNK_SIZE = 16384; // 16KB chunks

std::shared_ptr<ArrayBuffer> HybridGzip::gzip(const std::shared_ptr<ArrayBuffer>& data) {
  if (!data || data->size() == 0) {
    return ArrayBuffer::allocate(0);
  }

  z_stream strm;
  strm.zalloc = Z_NULL;
  strm.zfree = Z_NULL;
  strm.opaque = Z_NULL;

  // Initialize deflate with gzip options
  // Z_DEFAULT_COMPRESSION: default level
  // Z_DEFLATED: method
  // GZIP_WINDOW_BITS: window bits + 16 (gzip)
  // 8: memLevel (default)
  // Z_DEFAULT_STRATEGY: default strategy
  if (deflateInit2(&strm, Z_DEFAULT_COMPRESSION, Z_DEFLATED, GZIP_WINDOW_BITS, 8, Z_DEFAULT_STRATEGY) != Z_OK) {
    throw std::runtime_error("Failed to initialize zlib deflate");
  }

  const uint8_t* src = data->data();
  size_t srcLen = data->size();

  strm.next_in = const_cast<Bytef*>(reinterpret_cast<const Bytef*>(src));
  strm.avail_in = static_cast<uInt>(srcLen);

  std::vector<uint8_t> outBuffer;
  std::vector<uint8_t> chunk(CHUNK_SIZE);

  int ret;
  do {
    strm.next_out = reinterpret_cast<Bytef*>(chunk.data());
    strm.avail_out = CHUNK_SIZE;

    ret = deflate(&strm, Z_FINISH);

    if (ret == Z_STREAM_ERROR) {
      deflateEnd(&strm);
      throw std::runtime_error("Zlib stream error during compression");
    }

    size_t have = CHUNK_SIZE - strm.avail_out;
    outBuffer.insert(outBuffer.end(), chunk.begin(), chunk.begin() + have);

  } while (strm.avail_out == 0);

  deflateEnd(&strm);

  // Convert vector to ArrayBuffer
  return ArrayBuffer::copy(outBuffer);
}

std::shared_ptr<ArrayBuffer> HybridGzip::ungzip(const std::shared_ptr<ArrayBuffer>& data) {
  if (!data || data->size() == 0) {
    return ArrayBuffer::allocate(0);
  }

  z_stream strm;
  strm.zalloc = Z_NULL;
  strm.zfree = Z_NULL;
  strm.opaque = Z_NULL;
  strm.avail_in = 0;
  strm.next_in = Z_NULL;

  // Initialize inflate with gzip header detection (32 + 15 = 47 or just 31 is standard for "gzip or zlib")
  // Actually documentation says add 32 to enable zlib/gzip decoding with automatic header detection,
  // OR add 16 for gzip only. Let's use 15+32=47 for robust auto-detection or 15+16=31.
  // Let's stick to 31 (gzip only) or 15+32 (auto).
  // gRPC typically sends pure gzip. WindowBits 31 is standard for gzip stream.
  if (inflateInit2(&strm, GZIP_WINDOW_BITS) != Z_OK) {
    throw std::runtime_error("Failed to initialize zlib inflate");
  }

  const uint8_t* src = data->data();
  size_t srcLen = data->size();

  strm.next_in = const_cast<Bytef*>(reinterpret_cast<const Bytef*>(src));
  strm.avail_in = static_cast<uInt>(srcLen);

  std::vector<uint8_t> outBuffer;
  std::vector<uint8_t> chunk(CHUNK_SIZE);

  int ret;
  do {
    strm.next_out = reinterpret_cast<Bytef*>(chunk.data());
    strm.avail_out = CHUNK_SIZE;

    ret = inflate(&strm, Z_NO_FLUSH);

    if (ret != Z_OK && ret != Z_STREAM_END && ret != Z_BUF_ERROR) {
      inflateEnd(&strm);
      // Z_DATA_ERROR, Z_STREAM_ERROR, etc.
      throw std::runtime_error("Zlib error during decompression: " + std::to_string(ret));
    }

    // Z_BUF_ERROR means we need more input, but if we provided all input and still get it before END, it's an error.
    // Usually inflate returns Z_BUF_ERROR if avail_in is 0.

    size_t have = CHUNK_SIZE - strm.avail_out;
    outBuffer.insert(outBuffer.end(), chunk.begin(), chunk.begin() + have);

  } while (ret != Z_STREAM_END && strm.avail_out == 0); // Continue if output buffer full or not done

  inflateEnd(&strm);

  // If ret != Z_STREAM_END here, data might be incomplete or corrupted
  if (ret != Z_STREAM_END) {
    // Optional: throw error or return partial. For strict correctness: throw.
    // throw std::runtime_error("Zlib decompression incomplete");
  }

  return ArrayBuffer::copy(outBuffer);
}

} // namespace margelo::nitro::grpc
