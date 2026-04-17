import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveFulfillmentTo, sendSelectionEmail } from '@/lib/email';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ohb-admin-2026';
const RESEND_COOLDOWN_MS = 60_000;

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const password = authHeader.replace('Bearer ', '').trim();
  return password === ADMIN_PASSWORD.trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const { data: entry, error } = await supabaseAdmin
      .from('entries')
      .select('*, campaign:campaigns(*)')
      .eq('id', id)
      .single();

    if (error || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (entry.status !== 'winner') {
      return NextResponse.json(
        { error: 'Only winners can be re-emailed. Select this entry as a winner first.' },
        { status: 400 }
      );
    }

    if (!entry.reply_token) {
      return NextResponse.json(
        { error: 'This entry has no reply token. Re-select as winner.' },
        { status: 400 }
      );
    }

    if (entry.selected_at) {
      const elapsed = Date.now() - new Date(entry.selected_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSec}s before resending.` },
          { status: 429 }
        );
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ourherobalthazar.com';
    const replyUrl = `${appUrl}/freetickets/reply/${entry.reply_token}`;
    const replyToEmail = resolveFulfillmentTo(entry.campaign?.fulfillment_email);
    const campaignType: 'giveaway' | 'raffle' =
      entry.campaign?.campaign_type === 'raffle' ? 'raffle' : 'giveaway';

    const emailSent = await sendSelectionEmail({
      to: entry.email,
      name: entry.name,
      city: entry.city,
      campaignName: entry.campaign?.name || 'Our Hero, Balthazar',
      campaignType,
      replyUrl,
      replyToEmail,
      isResend: true,
    });

    await supabaseAdmin
      .from('entries')
      .update({ selected_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ emailSent, replyUrl });
  } catch (error) {
    console.error('Error resending selection email:', error);
    return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 });
  }
}
