import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Return public campaign data (no sensitive fields)
    return NextResponse.json({
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      description: campaign.description,
      prize_description: campaign.prize_description,
      eligible_cities: campaign.eligible_cities,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      winner_count: campaign.winner_count,
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}
