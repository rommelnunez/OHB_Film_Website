import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { findShowtime } from '@/lib/theaters';
import {
  resolveFulfillmentCc,
  resolveFulfillmentTo,
  sendFulfillmentNotification,
} from '@/lib/email';

const showtimeSchema = z.object({
  theater: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  ticketLink: z.string().optional().nullable(),
});

const replySchema = z.object({
  token: z.string().uuid(),
  requestedTickets: z.number().int().min(1).max(4),
  requestedShowtimes: z.array(showtimeSchema),
  waitForContact: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { token, requestedTickets, requestedShowtimes, waitForContact } = parsed.data;

    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('entries')
      .select('*')
      .eq('reply_token', token)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    if (entry.status !== 'winner') {
      return NextResponse.json({ error: 'This link is no longer active' }, { status: 400 });
    }

    if (entry.replied_at) {
      return NextResponse.json(
        { error: 'You have already submitted your preferences.' },
        { status: 409 }
      );
    }

    const verified: Array<{
      theater: string;
      date: string;
      time: string;
      eventType: string;
      ticketLink: string;
      city: string;
      soldOut: boolean;
    }> = [];

    if (!waitForContact) {
      if (requestedShowtimes.length === 0) {
        return NextResponse.json(
          { error: 'Please pick at least one showtime.' },
          { status: 400 }
        );
      }

      for (const s of requestedShowtimes) {
        const match = await findShowtime(entry.city, s.theater, s.date, s.time);
        if (!match) {
          return NextResponse.json(
            {
              error: `Could not verify showtime: ${s.theater} ${s.date} ${s.time}. Please refresh and try again.`,
            },
            { status: 400 }
          );
        }
        if (match.soldOut) {
          return NextResponse.json(
            { error: `That showtime is sold out: ${s.theater} ${s.date} ${s.time}.` },
            { status: 400 }
          );
        }
        verified.push(match);
      }
    }

    // Atomic guard: only the first successful update wins the race.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('entries')
      .update({
        requested_tickets: requestedTickets,
        requested_showtimes: verified,
        replied_at: new Date().toISOString(),
      })
      .eq('reply_token', token)
      .is('replied_at', null)
      .select('*')
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'This link has already been used or is no longer valid.' },
        { status: 409 }
      );
    }

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', updated.campaign_id)
      .single();

    const fulfillmentTo = resolveFulfillmentTo(campaign?.fulfillment_email);
    const fulfillmentCc = resolveFulfillmentCc(campaign?.fulfillment_cc_emails);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ourherobalthazar.com';

    // Fire-and-forget email; do not block the reply response on email delivery
    sendFulfillmentNotification({
      to: fulfillmentTo,
      cc: fulfillmentCc,
      entrantName: updated.name,
      entrantEmail: updated.email,
      entrantPhone: updated.phone || '',
      city: updated.city,
      campaignName: campaign?.name || 'Our Hero, Balthazar',
      requestedTickets,
      requestedShowtimes: verified,
      adminUrl: `${appUrl}/admin`,
    }).catch((e) => console.error('Fulfillment email failed:', e));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting reply:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
