import { WebSocketServer } from 'ws';
import { spawnPty } from './pty.js';
import type { ClientSession, WebSocketMessage } from './types.js';

const WS_PORT = Number(process.env.WS_PORT || 3001);
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const GRACE_PERIOD_TIMEOUT = 5000; // 5 seconds
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

   let isAlive = true;
   let gracePeriodTimer: NodeJS.Timeout | null = null;

   try {
     const pty = spawnPty();

     const session: ClientSession = {
       id: clientId,
       pty,
       createdAt: new Date(),
     };
     clients.set(clientId, session);

     // Setup heartbeat ping/pong to detect dead connections
     const heartbeat = setInterval(() => {
       if (!isAlive) {
         console.log('Client did not respond to heartbeat, terminating:', clientId);
         ws.terminate();
         return;
       }
       isAlive = false;
       ws.ping();
     }, HEARTBEAT_INTERVAL);

     // Reset isAlive flag when pong received
     ws.on('pong', () => {
       isAlive = true;
     });

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
        clearInterval(heartbeat);
        if (gracePeriodTimer) {
          clearTimeout(gracePeriodTimer);
          gracePeriodTimer = null;
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
       clearInterval(heartbeat);
       
       // Start grace period timer to allow PTY to shutdown gracefully
       gracePeriodTimer = setTimeout(() => {
         try {
           if (session.pty) {
             session.pty.kill();
             console.log('PTY killed after grace period:', clientId);
           }
         } catch (err) {
           // ESRCH means process already exited - ignore it
           if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
             throw err;
           }
         }
       }, GRACE_PERIOD_TIMEOUT);
     });



    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  } catch (err) {
    console.error('Error spawning PTY:', err);
    ws.close();
  }
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  wss.clients.forEach((ws) => {
    ws.close();
  });
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully...');
  wss.clients.forEach((ws) => {
    ws.close();
  });
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log(`PTY Server listening on ws://localhost:${WS_PORT}`);
