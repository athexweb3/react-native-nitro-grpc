#include "HybridSha256.hpp"
#include "../../utils/sha256/picosha2.h"
#include <vector>

namespace margelo::nitro::grpc {

std::string HybridSha256::hash(const std::string& data) {
  return picosha2::hash256_hex_string(data);
}

std::string HybridSha256::hashBytes(const std::shared_ptr<ArrayBuffer>& data) {
  if (!data || data->size() == 0) {
    std::string empty;
    return picosha2::hash256_hex_string(empty);
  }

  uint8_t* bytes = data->data();
  size_t size = data->size();

  std::vector<uint8_t> buffer(bytes, bytes + size);
  return picosha2::hash256_hex_string(buffer);
}

} // namespace margelo::nitro::grpc
