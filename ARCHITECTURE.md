# Architecture Overview

This document describes the system architecture and communication protocols of Terminus-Web.

## System Overview

Terminus-Web is designed as a client-server application that bridges a web-based terminal emulator with a real system PTY (Pseudo-Terminal).

```
+----------------+          +-------------------+          +-----------------+
|   Web Browser  | <------> |   PTY Server      | <------> |   OpenCode      |
| (xterm.js)     |    WS    | (Node.js/node-pty)|          |   Binary/TUI    |
+----------------+          +-------------------+          +-----------------+
```

### Components

1.  **Web Frontend (`apps/web`)**:
    -   Built with **Next.js 15** and **React 19**.
    -   Uses **xterm.js** for the terminal UI.
    -   **Redux Toolkit** manages terminal connection state and configuration.
    -   **useTerminalConnection** hook handles WebSocket lifecycle, reconnection, and message dispatching.

2.  **PTY Server (`apps/pty-server`)**:
    -   A **Node.js** WebSocket server using the `ws` library.
    -   Uses **node-pty** to spawn and manage pseudo-terminal processes.
    -   Manages the lifecycle of the OpenCode process, including graceful shutdowns on disconnect.

## Communication Protocol

Communication occurs over a single WebSocket connection. It uses both binary and JSON message formats.

### Binary Data (PTY Stream)

-   **Direction**: Bidirectional.
-   **Content**: Raw terminal input (from keyboard) and output (from PTY).
-   **Handling**: Passed directly between `xterm.js` (via `AttachAddon`) and `node-pty`.

### JSON Messages (Control Plane)

JSON messages are used for out-of-band signaling.

| Message Type | Direction | Payload Example | Description |
| :--- | :--- | :--- | :--- |
| `resize` | Client -> Server | `{ "type": "resize", "cols": 80, "rows": 24 }` | Notifies the PTY server to resize the terminal window. |
| `exit` | Server -> Client | `{ "type": "exit", "exitCode": 0 }` | Notifies the client that the PTY process has terminated. |
| `ping` | Client -> Server | `{ "type": "ping" }` | Heartbeat to keep the connection alive. |
| `pong` | Server -> Client | `{ "type": "pong" }` | Response to a heartbeat ping. |

## Data Flow

1.  **Initialization**:
    -   The client connects to the WebSocket server.
    -   The server spawns a new PTY process running the OpenCode binary.
2.  **Interaction**:
    -   User keystrokes are sent as binary data to the server, which writes them to the PTY.
    -   PTY output is sent as binary data to the client, which renders it via xterm.js.
3.  **Resizing**:
    -   When the browser window resizes, the `FitAddon` calculates new dimensions.
    -   The client sends a `resize` JSON message to the server.
    -   The server calls `pty.resize()` to update the terminal size.
4.  **Termination**:
    -   If the PTY process exits, the server sends an `exit` JSON message and closes the connection.
    -   If the WebSocket disconnects, the server waits for a 5-second grace period before killing the PTY process.

## Security Considerations

> **IMPORTANT**: The current MVP version of Terminus-Web **does not include authentication or authorization**.

-   **Environment**: It is intended for use in trusted environments or behind a secure VPN.
-   **Production**: In production, it **must** be served over HTTPS/WSS.
-   **Limitations**:
    -   No user session management.
    -   No rate limiting on WebSocket connections.
    -   The PTY process runs with the permissions of the Node.js server process.

### Future Improvements
-   Implement JWT-based session authentication.
-   Add rate limiting and connection pooling.
-   Implement input validation for control messages.
