#!/usr/bin/env node

async function testSSEConnection() {
  console.log('Testing SSE connection to /api/auto-update/progress...\n');

  try {
    const response = await fetch('http://localhost:3000/api/auto-update/progress', {
      headers: {
        Accept: 'text/event-stream',
      },
    });

    if (!response.ok) {
      console.error('Failed to connect:', response.status, response.statusText);
      return;
    }

    console.log('✅ SSE endpoint is accessible');
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('\n📡 Listening for SSE events...\n');

    let eventCount = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++;
          const data = line.slice(6);
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] Event #${eventCount}:`, data);

          try {
            const parsed = JSON.parse(data);
            console.log('  Parsed:', parsed);
          } catch (e) {
            console.log('  (Not JSON)');
          }
        }
      }

      // Stop after 10 seconds
      if (Date.now() - startTime > 10000) {
        console.log('\n⏱️  Test complete after 10 seconds');
        console.log(`📊 Received ${eventCount} events`);
        break;
      }
    }

    reader.cancel();
  } catch (error) {
    console.error('Error:', error);
  }
}

async function simulateUpdateTrigger() {
  console.log('\n\n🚀 Simulating update trigger...\n');

  try {
    const response = await fetch('http://localhost:3000/api/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Update request failed:', response.status);
      console.error('Response:', text);
      return;
    }

    console.log('✅ Update triggered successfully');
    console.log('Reading SSE stream from update endpoint...\n');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          console.log('Update Event:', data);
        }
      }
    }
  } catch (error) {
    console.error('Error triggering update:', error);
  }
}

async function main() {
  console.log('========================================');
  console.log('     Update System Test Suite');
  console.log('========================================\n');

  // Test 1: SSE Connection
  await testSSEConnection();

  // Test 2: Trigger Update (commented out by default to avoid actual update)
  // Uncomment to test actual update flow:
  // await simulateUpdateTrigger();

  console.log('\n✨ All tests complete!');
}

main().catch(console.error);
