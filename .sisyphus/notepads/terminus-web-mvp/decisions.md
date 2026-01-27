# Decisions: Terminus-Web MVP

## Architectural Choices
- **Architecture**: Separate WebSocket PTY server (port 3001) + Next.js frontend (port 3000)
- **Reason**: Enables proper deployment, clean separation of concerns, can scale independently

## Technology Stack
- **Backend**: Node.js/TypeScript with ws + node-pty
- **Frontend**: Next.js 15+ with React 19+, Redux Toolkit, Tailwind CSS, shadcn/ui
- **Terminal**: xterm.js with FitAddon, AttachAddon, ClipboardAddon
- **Protocol**: Binary for PTY data, JSON for control messages
