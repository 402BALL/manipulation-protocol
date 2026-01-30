import { NextResponse } from 'next/server';
import { runAgentTurn } from '@/lib/orchestrator';
import { supabase } from '@/lib/supabase';

// This endpoint runs one iteration of the experiment loop
// Call it periodically (e.g., every 2 minutes) to advance the experiment

export async function POST() {
  try {
    // Check if experiment is live
    const { data: experiment } = await supabase
      .from('experiment')
      .select('is_live')
      .eq('id', 1)
      .single();

    if (!experiment?.is_live) {
      return NextResponse.json({ 
        success: false, 
        message: 'Experiment is not running' 
      });
    }

    // Run a random agent's turn
    const result = await runAgentTurn();

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Loop error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - For health checks
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'experiment-loop' });
}

