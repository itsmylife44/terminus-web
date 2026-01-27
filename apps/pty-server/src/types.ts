import { IPty } from 'node-pty';

export interface PtySpawnOptions {
  shell?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
}

export interface ClientSession {
  id: string;
  pty: IPty;
  createdAt: Date;
}

export interface WebSocketMessage {
  type: 'data' | 'resize' | 'close' | 'ping' | 'pong';
  data?: string;
  cols?: number;
  rows?: number;
}
