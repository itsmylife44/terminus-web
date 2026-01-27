import { WebSocketServer } from 'ws';
import { spawnPty } from './pty.js';
import type { ClientSession, WebSocketMessage } from './types.js';

const WS_PORT = Number(process.env.WS_PORT || 3001);
const clients = new Map<string, ClientSession>();

const wss = new WebSocketServer({ port: WS_PORT });

/**
 * Validate and clamp resize dimensions
 * @param cols Column count
 * @param rows Row count
 * @returns Validated {cols, rows} with min 1, max 500, floored to integers
 */
function validateResizeDimensions(cols: unknown, rows: unknown): { cols: number; rows: number } {
  const validatedCols = Math.max(1, Math.min(500, Math.floor(Number(cols) || 80)));
  const validatedRows = Math.max(1, Math.min(500, Math.floor(Number(rows) || 24)));
  return { cols: validatedCols, rows: validatedRows };
}

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substring(2, 11);
  console.log('Client connected:', clientId);

  try {
    const pty = spawnPty();

    const session: ClientSession = {
      id: clientId,
      pty,
      createdAt: new Date(),
    };
    clients.set(clientId, session);

    // Handle PTY output: send to WebSocket with backpressure support
    pty.onData((data) => {
      if (ws.readyState === ws.OPEN) {
        // Use callback to handle backpressure after send completes
        ws.send(data, (err) => {
          if (!err) {
            // Resume PTY reading after successful send
            pty.resume();
          }
        });
        // Pause PTY to prevent buffer overflow
        pty.pause();
      }
    });

    // Handle PTY exit: send exit message with exit code
    pty.onExit(({ exitCode }) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'exit',
          code: exitCode,
        } as WebSocketMessage));
      }
      ws.close();
    });

    // Handle incoming WebSocket messages
    ws.on('message', (message) => {
      try {
        // Try to parse as JSON for control messages
        let msg: WebSocketMessage;
        try {
          msg = JSON.parse(message.toString()) as WebSocketMessage;
        } catch {
          // Not JSON: treat as raw input to PTY
          pty.write(message.toString());
          return;
        }

        // Handle different message types
        switch (msg.type) {
          case 'resize': {
            // Validate and apply resize
            if (typeof msg.cols === 'number' && typeof msg.rows === 'number') {
              const { cols, rows } = validateResizeDimensions(msg.cols, msg.rows);
              try {
                pty.resize(cols, rows);
                console.log(`Resized PTY ${clientId} to ${cols}x${rows}`);
              } catch (err) {
                console.error(`Error resizing PTY ${clientId}:`, err);
              }
            }
            break;
          }

          case 'ping': {
            // Respond with pong
            ws.send(JSON.stringify({
              type: 'pong',
            } as WebSocketMessage));
            break;
          }

          case 'data': {
            // Forward input to PTY
            if (msg.data) {
              pty.write(msg.data);
            }
            break;
          }

          default: {
            // Unknown message type - log and ignore
            console.warn(`Unknown message type: ${msg.type}`);
          }
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected:', clientId);
      if (session.pty) {
        session.pty.kill();
      }
      clients.delete(clientId);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  } catch (err) {
    console.error('Error spawning PTY:', err);
    ws.close();
  }
});

console.log(`PTY Server listening on ws://localhost:${WS_PORT}`);
