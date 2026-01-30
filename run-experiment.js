// Simple script to run the experiment loop locally
// Run with: node run-experiment.js

const INTERVAL_MS = 120000; // 2 minutes between AI turns
const API_URL = 'http://localhost:3000/api/experiment/loop';

async function runLoop() {
  console.log(`[${new Date().toISOString()}] Running experiment turn...`);
  
  try {
    const response = await fetch(API_URL, { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      console.log(`✓ Agent: ${data.agent}, Action: ${data.action}`);
      if (data.result?.type === 'post') {
        console.log(`  Posted on ${data.result.post?.platform}`);
      }
    } else {
      console.log(`✗ Error: ${data.error || data.message}`);
    }
  } catch (error) {
    console.error('Failed to call API:', error.message);
  }
}

console.log('=================================');
console.log('  THE ANONYMOUS - Experiment Runner');
console.log('=================================');
console.log(`Interval: ${INTERVAL_MS / 1000} seconds`);
console.log('Press Ctrl+C to stop\n');

// Run immediately, then on interval
runLoop();
setInterval(runLoop, INTERVAL_MS);

