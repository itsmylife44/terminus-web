# Terminus-Web

Web-based terminal that runs the OpenCode CLI/TUI in your browser with full interactivity using a real PTY (Pseudo-Terminal) environment.

## Architecture

```
Browser (ghostty-web) → Caddy → Next.js (port 3000)
                            └→ OpenCode serve (port 3001, /pty/* routes)
```

- **Frontend**: Next.js with ghostty-web terminal emulator
- **Backend**: `opencode serve` provides the PTY API
- **Reverse Proxy**: Caddy handles TLS and routing

## Quick Install (Ubuntu 24.04/22.04)

```bash
curl -fsSL https://raw.githubusercontent.com/itsmylife44/terminus-web/v1.1.2/scripts/install.sh -o install.sh && sudo bash install.sh
```

The installer will:

- Install Node.js 20, PM2, Caddy, and OpenCode
- Create a `terminus` system user
- Clone and build the application
- Configure automatic HTTPS with Let's Encrypt (for domains)
- Set up firewall rules (UFW)
- Start services with PM2

### Requirements

- Ubuntu 24.04 LTS or 22.04 LTS
- Root access (sudo)
- A domain pointing to your server (recommended for HTTPS)

### What You'll Be Asked

- Domain name or IP address
- Path for OpenCode binary (default: `/usr/local/bin/opencode`)
- Email for SSL certificate (optional, for Let's Encrypt notifications)

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/itsmylife44/terminus-web/v1.1.2/scripts/uninstall.sh -o uninstall.sh && sudo bash uninstall.sh
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- OpenCode installed (`curl -fsSL https://opencode.ai/install | bash`)

### Quick Start

1. **Clone and install**:

   ```bash
   git clone https://github.com/itsmylife44/terminus-web.git
   cd terminus-web
   npm install
   ```

2. **Start OpenCode serve** (in one terminal):

   ```bash
   opencode serve --port 3001 --hostname 127.0.0.1
   ```

3. **Start the frontend** (in another terminal):

   ```bash
   cd apps/web
   npm run dev
   ```

4. **Open** http://localhost:3000/terminal

### Environment Variables

Copy the example file and customize:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Or create `apps/web/.env.local` manually:

```env
NEXT_PUBLIC_OPENCODE_URL=http://localhost:3001
NEXT_PUBLIC_OPENCODE_COMMAND=/path/to/opencode
```

| Variable                       | Default                 | Description                               |
| ------------------------------ | ----------------------- | ----------------------------------------- |
| `TERMINUS_WEB_PORT`            | `3000`                  | Port for Next.js web frontend             |
| `OPENCODE_SERVE_PORT`          | `3001`                  | Port for OpenCode serve backend           |
| `NEXT_PUBLIC_OPENCODE_URL`     | `http://localhost:3001` | URL of OpenCode serve (browser WebSocket) |
| `OPENCODE_INTERNAL_URL`        | `http://localhost:3001` | Internal URL for server-side API proxy    |
| `NEXT_PUBLIC_OPENCODE_COMMAND` | (shell)                 | Command to run in PTY (optional)          |

> **Note**: See `apps/web/.env.example` for a complete template with descriptions.

---

## Production Deployment

### Automated Install (Recommended)

Use the one-liner installer for Ubuntu (see [Quick Install](#quick-install-ubuntu-240422) above).

### Manual Install

1. **Install OpenCode**:

   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```

2. **Build the project**:

   ```bash
   npm install
   npm run build
   ```

3. **Configure environment** (`apps/web/.env.local`):

   ```env
   NEXT_PUBLIC_OPENCODE_URL=https://yourdomain.com
   NEXT_PUBLIC_OPENCODE_COMMAND=/usr/local/bin/opencode
   OPENCODE_INTERNAL_URL=http://localhost:3001
   NODE_ENV=production

   # Optional: Custom ports (defaults: 3000/3001)
   # TERMINUS_WEB_PORT=3000
   # OPENCODE_SERVE_PORT=3001
   ```

4. **Start services** (PM2 recommended):

   ```bash
   # Start Next.js
   cd apps/web && npm start

   # Start OpenCode serve
   opencode serve --port 3001 --hostname 0.0.0.0
   ```

### Caddy Configuration

> **Note**: The automated installer configures Caddy automatically. If using custom ports, ensure the reverse_proxy targets match your `TERMINUS_WEB_PORT` and `OPENCODE_SERVE_PORT` values.

```caddyfile
yourdomain.com {
    tls your@email.com

    handle /pty/* {
        reverse_proxy localhost:3001  # OPENCODE_SERVE_PORT
    }

    handle {
        reverse_proxy localhost:3000  # TERMINUS_WEB_PORT
    }
}
```

### nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /pty/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## Features

- **Real PTY**: Full terminal interactivity with proper terminal emulation
- **ghostty-web**: Same terminal emulator OpenCode uses internally
- **Responsive**: Auto-resizing terminal
- **Clipboard**: Native copy/paste support
- **Resilient**: Automatic reconnection with exponential backoff
- **Status Indicator**: Real-time connection status

## Service Management (Production)

```bash
# Status
sudo su - terminus -c 'pm2 status'

# Logs
sudo su - terminus -c 'pm2 logs'

# Restart
sudo su - terminus -c 'pm2 restart all'

# Stop
sudo su - terminus -c 'pm2 stop all'
```

## License

MIT
