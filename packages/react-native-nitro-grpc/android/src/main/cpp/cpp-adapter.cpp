#include <jni.h>
#include "grpcOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::grpc::initialize(vm);
}
