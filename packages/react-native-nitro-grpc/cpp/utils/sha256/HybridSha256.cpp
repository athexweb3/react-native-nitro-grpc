#include "HybridSha256.hpp"
#include "picosha2.h"

namespace margelo::nitro::grpc {

std::string HybridSha256::hash(const std::string& data) {
  return picosha2::hash256_hex_string(data);
}

std::string HybridSha256::hashBytes(const std::shared_ptr<ArrayBuffer>& data) {
  std::vector<unsigned char> vec(data->data(), data->data() + data->size());
  return picosha2::hash256_hex_string(vec);
}

} // namespace margelo::nitro::grpc
