import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Simple password protection (set in env)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ohb-admin-2026';

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const password = authHeader.replace('Bearer ', '').trim();
  const envPassword = ADMIN_PASSWORD.trim();
  console.log('Auth check:', { receivedLength: password.length, expectedLength: envPassword.length, match: password === envPassword });
  return password === envPassword;
}

// GET all campaigns
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, entries:entries(count)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(campaigns || []);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST create new campaign
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields (ends_at is optional)
    if (!body.slug || !body.name || !body.starts_at) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, name, starts_at' },
        { status: 400 }
      );
    }

    // Validate slug format (URL-friendly)
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const { data: existing } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('slug', body.slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A campaign with this slug already exists' },
        { status: 400 }
      );
    }

    // Validate dates (only if end date is provided)
    const startsAt = new Date(body.starts_at);
    if (body.ends_at) {
      const endsAt = new Date(body.ends_at);
      if (endsAt <= startsAt) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // If activating this campaign, deactivate all others
    if (body.is_active) {
      await supabaseAdmin
        .from('campaigns')
        .update({ is_active: false })
        .eq('is_active', true);
    }

    const campaignType = body.campaign_type === 'raffle' ? 'raffle' : 'giveaway';

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        slug: body.slug,
        name: body.name,
        description: body.description || null,
        campaign_type: campaignType,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        prize_description: body.prize_description || '2 free tickets to Our Hero, Balthazar',
        winner_count: body.winner_count || 10,
        eligible_cities: body.eligible_cities || [],
        google_sheet_id: body.google_sheet_id || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || null,
        google_sheet_tab: body.google_sheet_tab || body.slug,
        fulfillment_email: body.fulfillment_email || null,
        fulfillment_cc_emails: body.fulfillment_cc_emails || null,
        is_active: body.is_active ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
