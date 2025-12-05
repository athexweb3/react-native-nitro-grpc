# React Native gRPC - Claude Code Configuration

This project uses the **4-Layer Orchestra Architecture** for efficient multi-agent development.

## Quick Reference

- **Simple tasks (1-2 files)**: Work directly, no orchestration needed
- **Complex tasks (3+ files)**: Use the orchestrator agent
- **Rules**: See `.agent/rules/*.xml` for architectural constraints
- **Agents**: See `.agent/agents/*.md` for specialist definitions

## Critical Principles

### 1. API Priority Order (NON-NEGOTIABLE)
When implementing features, favor in this order:
1. **gRPC Core API** - Official gRPC C++ Core
2. **Node.js implementation** - Reference implementation if applicable
3. **Legacy Native** - Avoid if possible

### 2. Modern Stack Required
- **React Native** - Mobile framework
- **TypeScript** - Type system (strict mode, no `any`)
- **Nitro Modules** - Native bridging
- **C++20 or higher** - Modern C++ (smart pointers, RAII)
- **gRPC Core 1.59+** - Official Google implementation
- **Bun 1.2+** - TypeScript package manager

### 3. Code Philosophy
- Minimize code rather than add more
- Prefer iteration and modularization over duplication
- No comments unless code is sufficiently complex
- Code should be self-documenting

### 4. Security is Critical
- Secure default connections (TLS)
- Non-blocking I/O
- Thread safety for all gRPC operations
- Proper error handling (gRPC status codes)

## Project Structure

```
react-native-grpc/
├── packages/
│   └── react-native-grpc/ # Library source
├── example/               # React Native test app
├── .agent/                # Orchestration configuration
│   ├── agents/            # Specialist agent definitions
│   └── rules/             # XML rules for context management
│   └── workflows/         # Automated agent workflows

```

## When to Use Orchestration

### Use Orchestrator For:
- ✅ Tasks touching 3+ files
- ✅ Cross-language changes (TypeScript + C++)
- ✅ New gRPC features (API + implementation)
- ✅ Complex refactoring

### Work Directly For:
- ✅ Single file changes
- ✅ Simple bug fixes
- ✅ Type updates
- ✅ Documentation

## Agent Workflows (Antigravity)
- **/setup**: Install dependencies and tools (`.agent/workflows/setup.md`).
- **/build**: Build library and example app (`.agent/workflows/build.md`).
- **/test**: Run linting and tests (`.agent/workflows/test.md`).
- **/release**: Publish new version (`.agent/workflows/release.md`).


## Available Specialists

- **orchestrator**: Decomposes complex tasks, coordinates specialists
- **typescript-specialist**: TypeScript API, types, Nitro bindings
- **cpp-specialist**: C++ implementation, gRPC integration
- **crypto-specialist**: Security review, TLS configuration
- **testing-specialist**: Test strategy, integration tests

## Quality Checks

Before committing:
- [ ] Type safety (no `any`, proper interfaces)
- [ ] Memory safety (smart pointers, RAII)
- [ ] Thread safety (CompletionQueue handling)
- [ ] Code quality (minimal, modular, self-documenting)
