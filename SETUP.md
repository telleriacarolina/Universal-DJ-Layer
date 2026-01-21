# Universal-DJ-Layer: Quick Setup & Integration

This guide provides step-by-step instructions for setting up your development environment and installing Universal-DJ-Layer.

## Prerequisites

### Install Homebrew (macOS)

If you don't have Homebrew installed, run the following command in Terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Steps:**
1. Open Terminal
2. Paste the command above and press Enter
3. Follow the on-screen instructions. You may need to enter your macOS password
4. After installation, add Homebrew to your PATH if the script shows instructions for it:

**For macOS ARM (M1/M2):**
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

**For macOS Intel:**
```bash
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"
```

5. Verify installation:
```bash
brew --version
```

Once Homebrew is installed, you can use it to install other packages, like git, node, or GitHub Copilot CLI.

## Install GitHub Copilot CLI (Optional)

Once Homebrew is installed, you can install GitHub Copilot CLI using the following command:

```bash
brew install copilot
```

**Notes:**
- This installs the official copilot formula
- If you want the Xcode plugin instead, use:
  ```bash
  brew install --cask copilot-for-xcode
  ```

Verify installation:
```bash
copilot --version
```

This should display the installed Copilot CLI version and confirm it's ready to use.

## Install Universal-DJ-Layer

Install Universal-DJ-Layer directly from GitHub:

```bash
npm install github:telleriacarolina/Universal-DJ-Layer
```

Or with pnpm:
```bash
pnpm add github:telleriacarolina/Universal-DJ-Layer
```

Or with yarn:
```bash
yarn add github:telleriacarolina/Universal-DJ-Layer
```

## Usage Examples

### ESM (ES Modules) Usage

```typescript
import { DJEngine, FeatureDisc } from "universal-dj-layer";

const engine = new DJEngine({ creatorId: "your-user-id" });

// Add a disc
const disc = new FeatureDisc({ /* config */ });
await engine.addDisc(disc, adminUser);

// Execute with role checks
await engine.executeDisc("feature-disc", context, user);
```

### CommonJS Usage

```javascript
const { DJEngine, FeatureDisc } = require("universal-dj-layer");

const engine = new DJEngine({ creatorId: "creator-1" });

// Add a disc
const disc = new FeatureDisc({ /* config */ });
await engine.addDisc(disc, adminUser);

// Execute with role checks
await engine.executeDisc("feature-disc", context, user);
```

## Quick Start Guide

### 1. Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install GitHub Copilot CLI (optional)
```bash
brew install copilot
# Optional: Install Copilot for Xcode if needed
# brew install --cask copilot-for-xcode
```

### 3. Verify Copilot CLI installation
```bash
copilot --version
```

### 4. Install Universal-DJ-Layer from GitHub
```bash
npm install github:telleriacarolina/Universal-DJ-Layer
# or with pnpm
# pnpm add github:telleriacarolina/Universal-DJ-Layer
```

## Next Steps

After installation, refer to the following documentation:
- [README.md](./README.md) - Overview and core concepts
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [INTEGRATION.md](./INTEGRATION.md) - Integration guide
- [Foundation Documentation](./docs/FOUNDATION.md) - StateManager & AuditLog guide

## Troubleshooting

### Homebrew Installation Issues
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`
- Check Homebrew's official troubleshooting guide: https://docs.brew.sh/Troubleshooting

### Package Installation Issues
- Ensure you have Node.js installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Try installing with verbose logging: `npm install github:telleriacarolina/Universal-DJ-Layer --verbose`

## Support

For issues and questions, please file an issue on the GitHub repository.
