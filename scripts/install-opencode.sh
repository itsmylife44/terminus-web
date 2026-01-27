#!/bin/bash
set -e

echo "Installing dependencies for node-pty..."
sudo apt-get update
sudo apt-get install -y build-essential python3

echo "Installing OpenCode..."
curl -fsSL https://opencode.ai/install | bash

echo "Verifying OpenCode installation..."
opencode --version

echo "✓ OpenCode installed successfully!"
