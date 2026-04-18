import { NextRequest, NextResponse } from 'next/server';
import { getShowtimesForCity } from '@/lib/theaters';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city');
  if (!city) {
    return NextResponse.json({ error: 'city is required' }, { status: 400 });
  }

  try {
    // Get screening date range from the active campaign
    const now = new Date().toISOString();
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('screening_start_date, screening_end_date, ends_at')
      .eq('is_active', true)
      .lte('starts_at', now)
      .order('starts_at', { ascending: false });

    const campaign = campaigns?.filter(
      (c) => !c.ends_at || new Date(c.ends_at) >= new Date(now)
    )?.[0];

    const showtimes = await getShowtimesForCity(city, {
      startDate: campaign?.screening_start_date || undefined,
      endDate: campaign?.screening_end_date || undefined,
    });

    return NextResponse.json(showtimes);
  } catch (error) {
    console.error('Error fetching showtimes:', error);
    return NextResponse.json({ error: 'Failed to load showtimes' }, { status: 500 });
  }
}
