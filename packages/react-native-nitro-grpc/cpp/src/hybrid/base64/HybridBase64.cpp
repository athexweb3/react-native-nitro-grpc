#include "HybridBase64.hpp"
#include "../../utils/base64/Base64.hpp"
#include <vector>

namespace margelo::nitro::grpc {

std::string HybridBase64::encode(const std::shared_ptr<ArrayBuffer>& data, bool urlSafe) {
  if (!data)
    return "";
  return base64_encode<std::string>(data->data(), data->size(), urlSafe);
}

std::shared_ptr<ArrayBuffer> HybridBase64::decode(const std::string& base64) {
  std::vector<char> decoded = base64_decode<std::vector<char>>(base64, false);
  return ArrayBuffer::copy(reinterpret_cast<const uint8_t*>(decoded.data()), decoded.size());
}

} // namespace margelo::nitro::grpc
