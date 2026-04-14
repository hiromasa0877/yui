import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendeeId, kodenAmount, kodenNumber } = body;

    if (!attendeeId || !kodenAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('attendees')
      .update({
        checked_in: true,
        check_in_method: 'smart',
        koden_amount: kodenAmount,
        koden_number: kodenNumber || null,
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', attendeeId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
