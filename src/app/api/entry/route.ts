import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { appendEntryToSheet } from '@/lib/sheets';
import { sendConfirmationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const entrySchema = z.object({
  campaignSlug: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  city: z.string().min(1, 'City is required'),
  ageConfirmed: z.boolean().refine((val) => val === true, {
    message: 'You must confirm you are 17 or older',
  }),
  captchaToken: z.string().min(1, 'Please complete the captcha'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = entrySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid input', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const { campaignSlug, name, email, phone, city, ageConfirmed, captchaToken } =
      parsed.data;

    // Rate limit check
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    // Verify hCaptcha
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return NextResponse.json(
        { error: 'Please complete the captcha verification.', code: 'CAPTCHA_FAILED' },
        { status: 400 }
      );
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('slug', campaignSlug)
      .eq('is_active', true)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found.', code: 'CAMPAIGN_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check campaign timing
    const now = new Date();
    const startsAt = new Date(campaign.starts_at);

    if (now < startsAt) {
      return NextResponse.json(
        {
          error: `This giveaway hasn't started yet. Check back on ${startsAt.toLocaleDateString()}.`,
          code: 'CAMPAIGN_NOT_STARTED',
        },
        { status: 400 }
      );
    }

    // Only check end date if one is set
    if (campaign.ends_at) {
      const endsAt = new Date(campaign.ends_at);
      if (now > endsAt) {
        return NextResponse.json(
          { error: 'This giveaway has ended.', code: 'CAMPAIGN_ENDED' },
          { status: 400 }
        );
      }
    }

    // Check if city is eligible
    if (campaign.eligible_cities && !campaign.eligible_cities.includes(city)) {
      return NextResponse.json(
        { error: 'This city is not eligible for this giveaway.', code: 'CITY_NOT_ELIGIBLE' },
        { status: 400 }
      );
    }

    // Check for existing entry
    const { data: existingEntry } = await supabaseAdmin
      .from('entries')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('email', email.toLowerCase())
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { error: "You've already entered this giveaway!", code: 'ALREADY_ENTERED' },
        { status: 400 }
      );
    }

    // Create entry
    const { data: entry, error: entryError } = await supabaseAdmin
      .from('entries')
      .insert({
        campaign_id: campaign.id,
        name,
        email: email.toLowerCase(),
        phone,
        city,
        age_confirmed: ageConfirmed,
        total_entries: 1,
        ip_address: ip,
        user_agent: request.headers.get('user-agent'),
      })
      .select()
      .single();

    if (entryError) {
      console.error('Error creating entry:', entryError);
      return NextResponse.json(
        { error: 'Failed to create entry. Please try again.', code: 'CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Sync to Google Sheet (async, don't block response)
    if (campaign.google_sheet_id) {
      appendEntryToSheet(
        campaign.google_sheet_id,
        campaign.google_sheet_tab || campaign.slug,
        {
          name,
          email,
          phone,
          city,
          totalEntries: 1,
        }
      ).then(async (success) => {
        if (success) {
          await supabaseAdmin
            .from('entries')
            .update({ synced_to_sheet_at: new Date().toISOString() })
            .eq('id', entry.id);
        }
      });
    }

    // Send confirmation email (async, don't block response)
    sendConfirmationEmail({
      to: email,
      name,
      city,
      campaignName: campaign.name,
      endDate: campaign.ends_at
        ? new Date(campaign.ends_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : null,
    });

    return NextResponse.json({
      success: true,
      message: "You're entered!",
      entryId: entry.id,
    });
  } catch (error) {
    console.error('Error processing entry:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn('HCAPTCHA_SECRET_KEY not set, skipping verification');
    return true; // Allow in development
  }

  try {
    const params = new URLSearchParams();
    params.append('response', token);
    params.append('secret', secret);
    params.append('sitekey', 'c7181926-2938-473a-9b14-f66022ec6684');

    const response = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    console.log('hCaptcha verification response:', JSON.stringify(data));
    return data.success === true;
  } catch (error) {
    console.error('Captcha verification error:', error);
    return false;
  }
}
