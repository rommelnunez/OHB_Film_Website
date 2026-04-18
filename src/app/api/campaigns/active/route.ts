import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const now = new Date().toISOString();

    // Get the currently active campaign (one that has started and not ended)
    // First try to find one with no end date or end date in future
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .order('starts_at', { ascending: false });

    if (error) throw error;

    // Filter to campaigns that haven't ended (no end date or end date in future)
    const activeCampaigns = campaigns?.filter(c =>
      !c.ends_at || new Date(c.ends_at) >= new Date(now)
    );

    const campaign = activeCampaigns?.[0];

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'No active campaign' },
        { status: 404 }
      );
    }

    // Return public campaign data
    return NextResponse.json({
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      description: campaign.description,
      campaign_type: campaign.campaign_type === 'raffle' ? 'raffle' : 'giveaway',
      prize_description: campaign.prize_description,
      eligible_cities: campaign.eligible_cities,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      winner_count: campaign.winner_count,
      screening_start_date: campaign.screening_start_date || null,
      screening_end_date: campaign.screening_end_date || null,
    });
  } catch (error) {
    console.error('Error fetching active campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}
