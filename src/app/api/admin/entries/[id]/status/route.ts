import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ohb-admin-2026';
const VALID_STATUSES = ['pending', 'winner', 'fulfilled', 'declined'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

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
    const body = await request.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.notes === 'string') {
      updates.notes = body.notes;
    }

    if (body.status) {
      if (!VALID_STATUSES.includes(body.status as ValidStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;

      if (body.status === 'fulfilled') {
        if (!body.booked_showtime) {
          return NextResponse.json(
            { error: 'booked_showtime is required when marking fulfilled' },
            { status: 400 }
          );
        }
        updates.booked_showtime = body.booked_showtime;
        updates.fulfilled_at = new Date().toISOString();
      } else if (body.status === 'pending') {
        updates.selected_at = null;
        updates.fulfilled_at = null;
        updates.booked_showtime = null;
      }
    }

    if (body.rotateToken === true) {
      const { randomUUID } = await import('crypto');
      updates.reply_token = randomUUID();
      updates.replied_at = null;
      updates.requested_tickets = null;
      updates.requested_showtimes = null;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('entries')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating entry status:', error);
      return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
    }

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}
