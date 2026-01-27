# Terminus-Web

## Quick Install (Ubuntu 24.04)

```bash
curl -fsSL https://raw.githubusercontent.com/itsmylife44/terminus-web/v1.0.1/scripts/install.sh -o install.sh && sudo bash install.sh
```

This automated installer will:
- Install Node.js 20, PM2, and Caddy
- Create a `terminus` system user
- Clone and build the application
- Configure automatic HTTPS with Let's Encrypt (for domains)
- Set up firewall rules (UFW)
- Start services with PM2

### Requirements
- Ubuntu 24.04 LTS or 22.04 LTS
- Root access (sudo)
- A domain pointing to your server (recommended for HTTPS)
- OpenCode binary (or install it during setup)

### What You'll Be Asked
- Domain name or IP address
- Path to OpenCode binary (default: `/usr/local/bin/opencode`)
- Email for SSL certificate (optional, for Let's Encrypt notifications)

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/itsmylife44/terminus-web/v1.0.1/scripts/uninstall.sh -o uninstall.sh && sudo bash uninstall.sh
```

---

Terminus-Web is a web-based terminal emulator that runs the OpenCode CLI/TUI in your browser with full interactivity. It provides a real PTY (Pseudo-Terminal) environment, allowing you to interact with OpenCode as if you were using a native terminal.

## Prerequisites

- **Node.js**: version 20 or higher
- **OpenCode Binary**: Must be installed on the server (default path: `/usr/local/bin/opencode`)

## Quick Start (< 5 minutes)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itsmylife44/terminus-web.git
   cd terminus-web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm run dev
   ```
   Access the frontend at `http://localhost:3000`. The PTY server will start automatically on port `3001`.

## Environment Variables

The following environment variables can be configured:

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | web | `3000` | Port for the Next.js frontend |
| `NEXT_PUBLIC_WS_URL` | web | `ws://localhost:3001` | WebSocket URL for the terminal connection |
| `WS_PORT` | pty-server | `3001` | Port for the WebSocket PTY server |
| `OPENCODE_PATH` | pty-server | `/usr/local/bin/opencode` | Absolute path to the OpenCode binary |

## Production Deployment

### Automated Install (Recommended)

Use the one-liner installer for Ubuntu 24.04/22.04 (see [Quick Install](#quick-install-ubuntu-2404) above).

### Manual Install with PM2

If you prefer manual installation or need a different OS:

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start with PM2**:
   ```bash
   npm run start
   ```
   This uses the `ecosystem.config.js` to manage both the web frontend and the PTY server.

## TLS / WSS Configuration

In production, you should always use `wss://` (WebSocket Secure). This requires a reverse proxy like **nginx** or **Caddy** to handle TLS termination.

### nginx Example

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Caddy Example

```caddyfile
yourdomain.com {
    reverse_proxy localhost:3000
    reverse_proxy /ws localhost:3001
}
```

> **Note**: After setting up TLS, ensure you update `NEXT_PUBLIC_WS_URL` to `wss://yourdomain.com/ws` (or your specific WS path).

## Features

- **Real PTY**: Full terminal interactivity with `TERM=xterm-256color`.
- **Responsive**: Auto-resizing terminal using `xterm-addon-fit`.
- **Clipboard**: Native copy/paste support (Ctrl+Shift+C/V).
- **Resilient**: Automatic reconnection with exponential backoff and heartbeat monitoring.
- **Status Indicator**: Real-time connection status (Connected, Reconnecting, Disconnected).
