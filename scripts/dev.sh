#!/bin/bash
set -e

echo "Starting Terminus-Web in development mode..."

echo "Starting PTY server..."
(cd apps/pty-server && npm run dev) &
PTY_PID=$!

echo "Starting web frontend..."
(cd apps/web && npm run dev) &
WEB_PID=$!

trap "echo 'Stopping services...'; kill $PTY_PID $WEB_PID 2>/dev/null; exit" INT TERM

wait
