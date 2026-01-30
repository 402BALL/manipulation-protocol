import { NextRequest, NextResponse } from 'next/server';
import { startExperiment, stopExperiment, runAgentTurn, generateGoal } from '@/lib/orchestrator';
import { supabase } from '@/lib/supabase';

// GET - Get experiment status
export async function GET() {
  try {
    const { data: experiment, error } = await supabase
      .from('experiment')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, experiment });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Control experiment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, agentId } = body;

    switch (action) {
      case 'start':
        const startResult = await startExperiment();
        return NextResponse.json(startResult);

      case 'stop':
        const stopResult = await stopExperiment();
        return NextResponse.json(stopResult);

      case 'turn':
        const turnResult = await runAgentTurn(agentId);
        return NextResponse.json(turnResult);

      case 'generate-goal':
        const goalResult = await generateGoal();
        return NextResponse.json(goalResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Experiment API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

