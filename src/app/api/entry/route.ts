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
  captchaToken: z.string().nullable().optional(),
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

    // Verify hCaptcha - TEMPORARILY DISABLED
    // const captchaResult = await verifyCaptcha(captchaToken);
    // if (!captchaResult.success) {
    //   console.error('Captcha failed:', captchaResult.error);
    //   return NextResponse.json(
    //     { error: 'Please complete the captcha verification.', code: 'CAPTCHA_FAILED', details: captchaResult.error },
    //     { status: 400 }
    //   );
    // }

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

    // Sync to Google Sheet - use env var as default, campaign can override
    const sheetId = (campaign.google_sheet_id || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
    let syncedToSheet = false;
    let sheetError: string | undefined;
    if (sheetId) {
      try {
        const result = await appendEntryToSheet(
          sheetId,
          (campaign.google_sheet_tab || campaign.slug).trim(),
          {
            name,
            email,
            phone,
            city,
            totalEntries: 1,
          }
        );
        if (result.ok) {
          syncedToSheet = true;
          await supabaseAdmin
            .from('entries')
            .update({ synced_to_sheet_at: new Date().toISOString() })
            .eq('id', entry.id);
        } else {
          sheetError = result.error;
          console.error('Failed to sync to Google Sheet:', result.error);
        }
      } catch (e) {
        sheetError = e instanceof Error ? e.message : String(e);
        console.error('Failed to sync to Google Sheet:', sheetError);
      }
    } else {
      sheetError = 'No spreadsheet ID configured for this campaign';
    }

    // Send confirmation email
    try {
      await sendConfirmationEmail({
        to: email,
        name,
        city,
        campaignName: campaign.name,
        campaignType: campaign.campaign_type === 'raffle' ? 'raffle' : 'giveaway',
        endDate: campaign.ends_at
          ? new Date(campaign.ends_at).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : null,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: "You're entered!",
      entryId: entry.id,
      syncedToSheet,
      sheetError,
    });
  } catch (error) {
    console.error('Error processing entry:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

async function verifyCaptcha(token: string): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn('HCAPTCHA_SECRET_KEY not set, skipping verification');
    return { success: true }; // Allow in development
  }

  try {
    const formData = new URLSearchParams();
    formData.append('response', token);
    formData.append('secret', secret);

    const response = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();
    console.log('hCaptcha response:', JSON.stringify(data));

    if (data.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: data['error-codes']?.join(', ') || 'Unknown error'
      };
    }
  } catch (error) {
    console.error('Captcha verification error:', error);
    return { success: false, error: String(error) };
  }
}
