import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveFulfillmentTo, sendSelectionEmail } from '@/lib/email';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ohb-admin-2026';

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const password = authHeader.replace('Bearer ', '').trim();
  return password === ADMIN_PASSWORD.trim();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('entries')
      .select('*, campaign:campaigns(*)')
      .eq('id', id)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (entry.status === 'winner' || entry.status === 'fulfilled') {
      return NextResponse.json({ entry, emailSent: false, alreadySelected: true });
    }

    const replyToken = entry.reply_token || randomUUID();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('entries')
      .update({
        status: 'winner',
        selected_at: new Date().toISOString(),
        reply_token: replyToken,
      })
      .eq('id', id)
      .select('*, campaign:campaigns(*)')
      .single();

    if (updateError) {
      console.error('Error updating entry on select:', updateError);
      return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ourherobalthazar.com';
    const replyUrl = `${appUrl}/freetickets/reply/${replyToken}`;
    const replyToEmail = resolveFulfillmentTo(updated.campaign?.fulfillment_email);
    const campaignType: 'giveaway' | 'raffle' =
      updated.campaign?.campaign_type === 'raffle' ? 'raffle' : 'giveaway';

    const emailSent = await sendSelectionEmail({
      to: updated.email,
      name: updated.name,
      city: updated.city,
      campaignName: updated.campaign?.name || 'Our Hero, Balthazar',
      campaignType,
      replyUrl,
      replyToEmail,
    });

    return NextResponse.json({ entry: updated, emailSent, replyUrl });
  } catch (error) {
    console.error('Error selecting winner:', error);
    return NextResponse.json({ error: 'Failed to select winner' }, { status: 500 });
  }
}
