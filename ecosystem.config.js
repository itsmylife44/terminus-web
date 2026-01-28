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
      name: 'terminus-pty',
      script: '/usr/local/bin/terminus-pty',
      args: [
        `--port`,
        `${process.env.OPENCODE_SERVE_PORT || 3001}`,
        `--host`,
        `0.0.0.0`,
        `--auth-user`,
        `${process.env.OPENCODE_SERVER_USERNAME || 'admin'}`,
        `--auth-pass`,
        `${process.env.OPENCODE_SERVER_PASSWORD || 'changeme'}`,
        `--command`,
        `${process.env.OPENCODE_COMMAND || '/usr/local/bin/opencode'}`,
        `--workdir`,
        `${process.env.OPENCODE_WORKDIR || '/home/terminus'}`,
      ].join(' '),
      env: {
        NODE_ENV: 'production',
        // OpenCode needs these for LLM access
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      },
    },
  ],
};
