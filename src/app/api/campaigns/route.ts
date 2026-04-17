import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('id, slug, name, description, starts_at, ends_at')
      .eq('is_active', true)
      .order('starts_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(campaigns || []);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json([], { status: 500 });
  }
}
