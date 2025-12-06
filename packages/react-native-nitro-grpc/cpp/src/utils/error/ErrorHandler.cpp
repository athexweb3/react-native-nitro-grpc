#include "ErrorHandler.hpp"
#include "../../core/metadata/MetadataConverter.hpp"

namespace margelo::nitro::grpc {
namespace ErrorHandler {

  GrpcError fromStatus(const ::grpc::Status& status, ::grpc::ClientContext& context) {
    GrpcError error;
    error.code = static_cast<int>(status.error_code());
    error.message = std::string(status.error_message());

    // Serialize trailing metadata
    auto trailingMetadata = context.GetServerTrailingMetadata();
    error.metadataJson = MetadataConverter::serializeTrailingMetadata(trailingMetadata);

    return error;
  }

  GrpcError fromStatus(const ::grpc::Status& status) {
    GrpcError error;
    error.code = static_cast<int>(status.error_code());
    error.message = std::string(status.error_message());
    error.metadataJson = "{}"; // No metadata available

    return error;
  }

} // namespace ErrorHandler
} // namespace margelo::nitro::grpc
