import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getShowtimesForCity } from '@/lib/theaters';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    const { data: entry, error } = await supabaseAdmin
      .from('entries')
      .select('*, campaign:campaigns(name, campaign_type)')
      .eq('reply_token', token)
      .single();

    if (error || !entry) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    if (entry.status !== 'winner') {
      return NextResponse.json({ error: 'This link is no longer active' }, { status: 404 });
    }

    if (entry.replied_at) {
      return NextResponse.json(
        {
          error: 'You have already submitted your preferences.',
          alreadyReplied: true,
          name: entry.name,
        },
        { status: 410 }
      );
    }

    let showtimes;
    try {
      showtimes = await getShowtimesForCity(entry.city);
    } catch (e) {
      console.error('Failed to read showtimes:', e);
      return NextResponse.json(
        { error: 'Showtime list is unavailable, please try again shortly' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      firstName: (entry.name || '').split(' ')[0],
      name: entry.name,
      city: entry.city,
      campaignName: entry.campaign?.name || 'Our Hero, Balthazar',
      campaignType:
        entry.campaign?.campaign_type === 'raffle' ? 'raffle' : 'giveaway',
      showtimes,
    });
  } catch (error) {
    console.error('Error loading reply context:', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
