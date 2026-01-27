#!/bin/bash
set -e

echo "Starting Terminus-Web in development mode..."
echo ""
echo "NOTE: You need to run 'opencode serve --port 3001 --hostname 127.0.0.1' separately"
echo "      or install OpenCode first: curl -fsSL https://opencode.ai/install.sh | bash"
echo ""

echo "Starting web frontend on http://localhost:3000..."
cd apps/web && npm run dev
