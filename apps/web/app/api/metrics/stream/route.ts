import { NextRequest } from 'next/server';
import si from 'systeminformation';

// Cache for metrics to reduce system calls
let cachedMetrics: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000; // 1 second in milliseconds

// Collect system metrics
async function collectMetrics() {
  try {
    const [cpu, mem, fsSize, currentLoad, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.time()
    ]);

    // Calculate percentages
    const cpuPercent = Math.round(cpu.currentLoad);
    const memoryPercent = Math.round((mem.used / mem.total) * 100);
    
    // Get primary disk usage (usually the root partition)
    const primaryDisk = fsSize[0] || { used: 0, size: 1 };
    const diskPercent = Math.round((primaryDisk.used / primaryDisk.size) * 100);
    
    // Load average (1 minute)
    const loadAverage = currentLoad.avgLoad || 0;
    
    // System uptime in seconds
    const uptimeSeconds = time.uptime || 0;

    return {
      cpu: cpuPercent,
      memory: memoryPercent,
      disk: diskPercent,
      load: loadAverage,
      uptime: uptimeSeconds,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error collecting metrics:', error);
    // Return default values on error
    return {
      cpu: 0,
      memory: 0,
      disk: 0,
      load: 0,
      uptime: 0,
      timestamp: Date.now()
    };
  }
}

// Get metrics with caching
async function getMetrics() {
  const now = Date.now();
  
  // Return cached metrics if still valid
  if (cachedMetrics && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMetrics;
  }
  
  // Collect fresh metrics
  cachedMetrics = await collectMetrics();
  cacheTimestamp = now;
  return cachedMetrics;
}

export async function GET(request: NextRequest) {
  // Set SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });

  // Create a TransformStream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Flag to track if stream is still active
  let isActive = true;

  // Start streaming metrics
  const streamMetrics = async () => {
    try {
      // Send initial metrics immediately
      const initialMetrics = await getMetrics();
      await writer.write(encoder.encode(`data: ${JSON.stringify(initialMetrics)}\n\n`));

      // Set up intervals for metrics and heartbeat
      const metricsInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(metricsInterval);
          return;
        }

        try {
          const metrics = await getMetrics();
          await writer.write(encoder.encode(`data: ${JSON.stringify(metrics)}\n\n`));
        } catch (error) {
          console.error('Error sending metrics:', error);
          isActive = false;
          clearInterval(metricsInterval);
        }
      }, 1000); // Send metrics every second

      const heartbeatInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(heartbeatInterval);
          return;
        }

        try {
          // Send SSE comment as heartbeat
          await writer.write(encoder.encode(':\n\n'));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          isActive = false;
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        isActive = false;
        clearInterval(metricsInterval);
        clearInterval(heartbeatInterval);
        writer.close().catch(() => {});
      });

    } catch (error) {
      console.error('Stream error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to stream metrics';
      await writer.write(encoder.encode(`event: error\ndata: ${errorMessage}\n\n`));
      await writer.close();
    }
  };

  // Start streaming in background
  streamMetrics();

  return new Response(readable, { headers });
}
