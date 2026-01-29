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

### Persistent Sessions

Terminal sessions now persist across browser disconnections using tmux:

- **Cross-device access**: Start a session at home, continue at work
- **Background execution**: Sessions keep running while browser closed
- **Session takeover**: Take control of sessions from other devices
- **Scrollback preservation**: Full terminal history restored on reconnect
- **Visual indicators**: Red dot shows when session is in use elsewhere

#### Requirements

tmux must be installed on the system:

```bash
# Ubuntu/Debian
sudo apt-get install tmux

# macOS
brew install tmux

# CentOS/RHEL
sudo yum install tmux
```

#### Configuration

Enable persistent sessions by passing the `--tmux-enabled` flag to terminus-pty:

```bash
terminus-pty --tmux-enabled --session-timeout 24h --max-inactive 24h --port 3001
```

#### CLI Flags

- `--tmux-enabled` (default: `false`)
  - Enables tmux-based persistent sessions
  - **Must be explicitly enabled** - not enabled by default for safety

- `--session-timeout` (default: `30s`)
  - How long a session persists after all clients disconnect
  - Recommended for production: `24h` or longer
  - Format: Go duration strings (e.g., `30s`, `5m`, `24h`, `7d`)

- `--max-inactive` (default: `24h`)
  - Auto-cleanup of sessions inactive for this duration
  - Only applies when `--tmux-enabled` is set
  - Format: Go duration strings

- `--cleanup-interval-tmux` (default: `1h`, minimum: `10m`)
  - How often to check for inactive sessions to cleanup
  - Only applies when `--tmux-enabled` is set
  - Minimum enforced at 10 minutes to prevent excessive CPU usage

#### Example Usage

**Development (persistent sessions enabled):**

```bash
terminus-pty --tmux-enabled --session-timeout 2h --port 3001
```

**Production (long-lived persistent sessions):**

```bash
terminus-pty --tmux-enabled \
  --session-timeout 24h \
  --max-inactive 7d \
  --cleanup-interval-tmux 1h \
  --port 3001 \
  --host 0.0.0.0
```

#### Testing Persistent Sessions

1. Create a terminal session and run a command
2. Close the browser tab (or disconnect)
3. Browse to another device or wait a moment
4. Reconnect in the same browser or another device
5. The session will still be running with full scrollback history preserved

You can verify tmux sessions are running:

```bash
# List all tmux sessions
tmux list-sessions

# Show details of a specific session
tmux capture-pane -t pty_SESSION_ID -p -S -100
```

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

   # Start terminus-pty (with persistent sessions enabled)
   terminus-pty \
     --port 3001 \
     --host 0.0.0.0 \
     --auth-user admin \
     --auth-pass yourpassword \
     --tmux-enabled \
     --session-timeout 24h \
     --max-inactive 7d \
     --cleanup-interval-tmux 1h
   ```

   **Note**: For persistent sessions, ensure `tmux` is installed:

   ```bash
   sudo apt-get update && sudo apt-get install -y tmux
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

### PM2 Process Manager

The automated installer configures PM2 with systemd integration for automatic startup on system boot.

#### PM2 Commands

```bash
# Status
sudo su - terminus -c 'pm2 status'

# Logs (real-time)
sudo su - terminus -c 'pm2 logs'

# Logs (specific app)
sudo su - terminus -c 'pm2 logs terminus-web'
sudo su - terminus -c 'pm2 logs terminus-pty'

# Restart
sudo su - terminus -c 'pm2 restart all'
sudo su - terminus -c 'pm2 restart terminus-web'
sudo su - terminus -c 'pm2 restart terminus-pty'

# Stop
sudo su - terminus -c 'pm2 stop all'

# Start
sudo su - terminus -c 'pm2 start all'
```

### Systemd Integration

PM2 automatically creates a systemd service for auto-start on boot. The installer runs:

```bash
pm2 startup systemd -u terminus --hp /home/terminus
pm2 save
```

This creates a systemd service at: `/etc/systemd/system/pm2-terminus.service`

#### Systemd Service Commands

```bash
# Check PM2 systemd service status
sudo systemctl status pm2-terminus

# Enable/disable auto-start
sudo systemctl enable pm2-terminus
sudo systemctl disable pm2-terminus

# Restart PM2 systemd service
sudo systemctl restart pm2-terminus

# View systemd logs
sudo journalctl -u pm2-terminus -f
```

### Caddy Web Server

```bash
# Check Caddy status
sudo systemctl status caddy

# Restart Caddy
sudo systemctl restart caddy

# View Caddy logs
sudo journalctl -u caddy -f

# Reload Caddy configuration
sudo systemctl reload caddy
```

### Full System Restart

To restart all services after a system update:

```bash
# Restart PM2 apps
sudo su - terminus -c 'pm2 restart all'

# Restart Caddy
sudo systemctl restart caddy
```

## License

MIT
