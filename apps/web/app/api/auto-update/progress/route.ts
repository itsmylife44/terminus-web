import { NextRequest } from 'next/server';

let activeConnections = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  console.log('[SSE Progress] New connection established');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      activeConnections.add(controller);
      console.log('[SSE Progress] Active connections:', activeConnections.size);

      const sendEvent = (data: any) => {
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('[SSE Progress] Error sending event:', error);
        }
      };

      sendEvent({ type: 'connected', message: 'Connected to update stream' });

      request.signal.addEventListener('abort', () => {
        console.log('[SSE Progress] Client disconnected');
        activeConnections.delete(controller);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export function broadcastUpdateEvent(event: any) {
  console.log(
    '[SSE Progress] Broadcasting event to',
    activeConnections.size,
    'connections:',
    event
  );
  const encoder = new TextEncoder();

  activeConnections.forEach((controller) => {
    try {
      const message = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      console.error('[SSE Progress] Error broadcasting to controller:', error);
      activeConnections.delete(controller);
    }
  });
}
