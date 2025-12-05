---
description: How to set up the development environment from scratch
---

1. Install dependencies
// turbo
```bash
bun install
```

2. Install CocoaPods (iOS)
// turbo
```bash
bun pods
```

3. Generate Nitro Bindings
// turbo
```bash
bun nitro-codegen
```

4. Verify C++ Setup
// turbo
```bash
scripts/setup_clang_env.sh
```
