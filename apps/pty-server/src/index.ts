import { WebSocketServer } from 'ws';
import { spawnPty } from './pty.js';
import type { ClientSession, WebSocketMessage } from './types.js';

const WS_PORT = Number(process.env.WS_PORT || 3001);
const clients = new Map<string, ClientSession>();

const wss = new WebSocketServer({ port: WS_PORT });

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

    pty.onData((data) => {
      ws.send(JSON.stringify({
        type: 'data',
        data: data.toString(),
      } as WebSocketMessage));
    });

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString()) as WebSocketMessage;

        if (msg.type === 'data' && msg.data) {
          pty.write(msg.data);
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
