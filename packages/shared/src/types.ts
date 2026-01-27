/**
 * Shared types for Terminus Web
 */

export interface TerminalMessage {
  type: 'data' | 'resize' | 'command';
  payload: unknown;
}

export interface ResizeMessage extends TerminalMessage {
  type: 'resize';
  payload: {
    cols: number;
    rows: number;
  };
}

export interface DataMessage extends TerminalMessage {
  type: 'data';
  payload: string | ArrayBuffer;
}

export interface CommandMessage extends TerminalMessage {
  type: 'command';
  payload: {
    command: string;
    args?: Record<string, unknown>;
  };
}
