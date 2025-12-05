#!/bin/bash

set -e

echo "Starting the release process..."
echo "Provided options: $@"

echo "Publishing 'react-native-grpc' to NPM"
cp README.md packages/react-native-grpc/README.md
cd packages/react-native-grpc
bun release $@

echo "Creating a Git bump commit and GitHub release"
cd ../..
bun run release-it $@

echo "Successfully released RNGrpc!"
