#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FRONTEND_DIR="/Users/xspam/Desktop/terminus-web/apps/web"
BACKEND_DIR="/Users/xspam/Desktop/terminus-pty"
BACKEND_BIN="$BACKEND_DIR/terminus-pty"

LOG_DIR="$HOME/.terminus-web-logs"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_LOG="$LOG_DIR/backend.log"

PID_DIR="$HOME/.terminus-web-pids"
FRONTEND_PID="$PID_DIR/frontend.pid"
BACKEND_PID="$PID_DIR/backend.pid"

mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Terminus-Web Development Startup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    if [ -f "$FRONTEND_PID" ]; then
        FPID=$(cat "$FRONTEND_PID")
        if kill -0 "$FPID" 2>/dev/null; then
            echo -e "${YELLOW}Stopping frontend (PID: $FPID)...${NC}"
            kill "$FPID" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID"
    fi
    
    if [ -f "$BACKEND_PID" ]; then
        BPID=$(cat "$BACKEND_PID")
        if kill -0 "$BPID" 2>/dev/null; then
            echo -e "${YELLOW}Stopping backend (PID: $BPID)...${NC}"
            kill "$BPID" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID"
    fi
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}✗ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}✗ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -f "$BACKEND_BIN" ]; then
    echo -e "${YELLOW}⚠ terminus-pty binary not found, attempting to build...${NC}"
    cd "$BACKEND_DIR"
    if [ -f "go.mod" ]; then
        go build -o terminus-pty .
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ terminus-pty built successfully${NC}"
        else
            echo -e "${RED}✗ Failed to build terminus-pty${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ go.mod not found in backend directory${NC}"
        exit 1
    fi
fi

echo -e "\n${BLUE}Starting backend (terminus-pty)...${NC}"
cd "$BACKEND_DIR"
nohup ./terminus-pty \
    -port 3001 \
    -host 127.0.0.1 \
    > "$BACKEND_LOG" 2>&1 &

BACKEND_PID_VALUE=$!
echo "$BACKEND_PID_VALUE" > "$BACKEND_PID"
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID_VALUE)${NC}"
echo -e "  Log: $BACKEND_LOG"
echo -e "  URL: http://localhost:3001"

sleep 2

if ! kill -0 "$BACKEND_PID_VALUE" 2>/dev/null; then
    echo -e "${RED}✗ Backend failed to start. Check logs: $BACKEND_LOG${NC}"
    tail -n 20 "$BACKEND_LOG"
    exit 1
fi

echo -e "\n${BLUE}Starting frontend (Next.js)...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules not found, running npm install...${NC}"
    npm install
fi

nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID_VALUE=$!
echo "$FRONTEND_PID_VALUE" > "$FRONTEND_PID"
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID_VALUE)${NC}"
echo -e "  Log: $FRONTEND_LOG"
echo -e "  URL: http://localhost:3000"

echo -e "\n${YELLOW}Waiting for frontend to be ready...${NC}"
RETRIES=30
READY=false
for i in $(seq 1 $RETRIES); do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        READY=true
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

if [ "$READY" = true ]; then
    echo -e "${GREEN}✓ Frontend is ready!${NC}"
else
    echo -e "${YELLOW}⚠ Frontend might still be starting up...${NC}"
fi

echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Development environment is running!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "  ${GREEN}Backend:${NC}  http://localhost:3001"
echo -e ""
echo -e "  ${YELLOW}Logs:${NC}"
echo -e "    Frontend: $FRONTEND_LOG"
echo -e "    Backend:  $BACKEND_LOG"
echo -e ""
echo -e "  ${YELLOW}PIDs:${NC}"
echo -e "    Frontend: $FRONTEND_PID_VALUE"
echo -e "    Backend:  $BACKEND_PID_VALUE"
echo -e ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

echo -e "\n${BLUE}Showing combined logs (Ctrl+C to exit):${NC}\n"

tail -f "$FRONTEND_LOG" "$BACKEND_LOG" 2>/dev/null || {
    echo -e "${YELLOW}Keeping services running in background...${NC}"
    wait
}
