module.exports = {
  apps: [
    {
      name: 'terminus-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'opencode-serve',
      script: '/usr/local/bin/opencode',
      args: 'serve --port 3001 --hostname 0.0.0.0',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
