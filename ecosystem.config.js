module.exports = {
  apps: [
    {
      name: 'terminus-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'start',
      env: {
        PORT: process.env.TERMINUS_WEB_PORT || 3000,
        NODE_ENV: 'production',
      },
    },
    {
      name: 'opencode-serve',
      script: '/usr/local/bin/opencode',
      args: `serve --port ${process.env.OPENCODE_SERVE_PORT || 3001} --hostname 0.0.0.0`,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
