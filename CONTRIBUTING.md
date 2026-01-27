# Contributing to Terminus-Web

Thank you for your interest in contributing to Terminus-Web! This document provides guidelines for development and the contribution process.

## Project Structure

Terminus-Web is a monorepo managed by **Turborepo**.

```
terminus-web/
├── apps/
│   ├── web/           # Next.js frontend (Tailwind CSS, Redux, xterm.js)
│   └── pty-server/    # Node.js WebSocket server (node-pty)
├── packages/
│   └── shared/        # Shared TypeScript types
├── scripts/           # Utility scripts (installers, dev helpers)
├── ecosystem.config.js # PM2 configuration
└── turbo.json         # Turborepo configuration
```

## Development Workflow

### Prerequisites
- Node.js 20+
- npm

### Setup
1. Clone the repository.
2. Run `npm install` in the root directory.

### Running in Development
Run the following command in the root directory to start both the frontend and the PTY server with hot-reloading:
```bash
npm run dev
```

### Running Individual Workspaces
If you only want to work on one part of the system:
```bash
# Start only the web frontend
npx turbo run dev --filter=web

# Start only the PTY server
npx turbo run dev --filter=pty-server
```

## Code Standards

### Formatting and Linting
- **Prettier**: Used for code formatting.
- **ESLint**: Used for static analysis.

Run linting checks:
```bash
npm run lint
```

### TypeScript
- All new code should be written in TypeScript.
- Avoid using `any` - define proper interfaces/types in `packages/shared` or locally if they are not shared.

## Pull Request Process

1.  Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`.
2.  Make your changes and ensure they follow the code standards.
3.  Write clear, concise commit messages.
4.  Push your branch to your fork.
5.  Open a Pull Request with a descriptive title and summary of changes.

## Development Guidelines

- **Atomic Commits**: Keep commits small and focused on a single change.
- **Documentation**: If you add a new feature, update the relevant documentation (`README.md` or `ARCHITECTURE.md`).
- **Testing**: Ensure that your changes do not break the core terminal functionality (connection, resizing, input/output).
