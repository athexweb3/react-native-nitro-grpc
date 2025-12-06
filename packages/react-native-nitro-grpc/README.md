# react-native-grpc

A high-performance gRPC library for React Native using Nitro Modules


## Installation

1. Install the package:
```sh
npm install react-native-nitro-grpc
# or
yarn add react-native-nitro-grpc
# or
bun add react-native-nitro-grpc
```

2. Configure your `ios/Podfile` to fix gRPC dependencies:

```ruby
# Add this at the top of your Podfile
require File.join(File.dirname(`node --print "require.resolve('react-native-nitro-grpc/package.json')"`), "scripts/fix-grpc.rb")

target 'YourApp' do
  # ... default setup ...

  # Install gRPC dependencies with correct configuration (modular headers)
  RNGrpc.install_dependencies(self)

  # ...
  
  post_install do |installer|
    # Apply gRPC module map fixes
    RNGrpc.post_install(installer)
    
    # ...
  end
end
```

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).


## Usage


```js
import { multiply } from 'react-native-grpc';

// ...

const result = multiply(3, 7);
```


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
