module.exports = {
  apps: [
    {
      name: 'terminus-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        NEXT_PUBLIC_WS_URL: 'ws://localhost:3001'
        // For production with TLS: wss://yourdomain.com
      }
    },
    {
      name: 'terminus-pty',
      cwd: './apps/pty-server',
      script: 'npm',
      args: 'start',
      env: {
        WS_PORT: 3001,
        OPENCODE_PATH: '/usr/local/bin/opencode'
        // Adjust path based on installation
      }
    }
  ]
};

// TLS NOTE:
// For production with WSS (TLS WebSocket):
// - Use nginx or Caddy as reverse proxy with TLS termination
// - nginx: proxy_pass ws://localhost:3001
// - Caddy: reverse_proxy localhost:3001
// - Update NEXT_PUBLIC_WS_URL to wss://yourdomain.com
