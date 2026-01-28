# Terminus-Web

Web-based terminal in your browser with full interactivity using a real PTY (Pseudo-Terminal) environment.

## Architecture

```
Browser (ghostty-web) → Caddy → Next.js (port 3000)
                            └→ terminus-pty (port 3001, /pty and /pty/* routes)
```

- **Frontend**: Next.js with ghostty-web terminal emulator
- **Backend**: [terminus-pty](https://github.com/itsmylife44/terminus-pty) - Go PTY server with session pooling
- **Reverse Proxy**: Caddy handles TLS and routing

## Features

- **Session Pooling**: Terminal sessions survive disconnections (60s timeout)
- **Real PTY**: Full terminal interactivity with proper terminal emulation
- **ghostty-web**: Same terminal emulator OpenCode uses internally
- **Responsive**: Auto-resizing terminal
- **Clipboard**: Native copy/paste support
- **Multi-Client**: Multiple browser tabs can connect to the same session

## Quick Install (Ubuntu 24.04/22.04)

```bash
curl -fsSL https://raw.githubusercontent.com/itsmylife44/terminus-web/main/scripts/install.sh -o install.sh && sudo bash install.sh
```

The installer will:

- Install Node.js 20, PM2, Caddy, Go, and terminus-pty
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
- Email for SSL certificate (optional, for Let's Encrypt notifications)

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/itsmylife44/terminus-web/main/scripts/uninstall.sh -o uninstall.sh && sudo bash uninstall.sh
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- Go 1.21+ (for terminus-pty)

### Quick Start

1. **Clone and install**:

   ```bash
   git clone https://github.com/itsmylife44/terminus-web.git
   cd terminus-web
   npm install
   ```

2. **Install and start terminus-pty** (in one terminal):

   ```bash
   go install github.com/itsmylife44/terminus-pty@latest
   terminus-pty --port 3001 --host 127.0.0.1
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
```

| Variable                   | Default                 | Description                              |
| -------------------------- | ----------------------- | ---------------------------------------- |
| `TERMINUS_WEB_PORT`        | `3000`                  | Port for Next.js web frontend            |
| `OPENCODE_SERVE_PORT`      | `3001`                  | Port for terminus-pty backend            |
| `NEXT_PUBLIC_OPENCODE_URL` | `http://localhost:3001` | URL of PTY server (browser WebSocket)    |
| `OPENCODE_INTERNAL_URL`    | `http://localhost:3001` | Internal URL for server-side API proxy   |
| `DATABASE_PATH`            | `./data/terminus.db`    | SQLite database path for session storage |

---

## Production Deployment

### Automated Install (Recommended)

Use the one-liner installer for Ubuntu (see [Quick Install](#quick-install-ubuntu-240422) above).

### Manual Install

1. **Install terminus-pty**:

   ```bash
   go install github.com/itsmylife44/terminus-pty@latest
   ```

2. **Build the project**:

   ```bash
   npm install
   npm run build
   ```

3. **Configure environment** (`apps/web/.env.local`):

   ```env
   NEXT_PUBLIC_OPENCODE_URL=https://yourdomain.com
   OPENCODE_INTERNAL_URL=http://localhost:3001
   NODE_ENV=production
   ```

4. **Start services** (PM2 recommended):

   ```bash
   # Start Next.js
   cd apps/web && npm start

   # Start terminus-pty
   terminus-pty --port 3001 --host 0.0.0.0 --auth-user admin --auth-pass yourpassword
   ```

### Caddy Configuration

```caddyfile
yourdomain.com {
    tls your@email.com

    @pty path /pty /pty/*
    handle @pty {
        reverse_proxy localhost:3001
    }

    handle {
        reverse_proxy localhost:3000
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

    location ~ ^/pty(/.*)?$ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

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
