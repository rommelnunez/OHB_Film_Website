import { Resend } from 'resend';
import type { Showtime } from './theaters';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = 'Our Hero Balthazar <noreply@ourherobalthazar.com>';

const DEFAULT_FULFILLMENT_EMAIL = 'tn@wgpictures.com';
const DEFAULT_FULFILLMENT_CC = 'contact@wgpictures.com';

function splitEmailList(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveFulfillmentTo(campaignOverride: string | null | undefined): string {
  return (
    (campaignOverride || '').trim() ||
    (process.env.FULFILLMENT_EMAIL || '').trim() ||
    DEFAULT_FULFILLMENT_EMAIL
  );
}

export function resolveFulfillmentCc(campaignCcOverride: string | null | undefined): string[] {
  const always = (process.env.FULFILLMENT_CC_EMAIL || '').trim() || DEFAULT_FULFILLMENT_CC;
  const extras = splitEmailList(campaignCcOverride);
  const all = [always, ...extras].filter(Boolean);
  return Array.from(new Set(all.map((e) => e.toLowerCase())));
}

interface SendConfirmationEmailParams {
  to: string;
  name: string;
  city: string;
  campaignName: string;
  campaignType?: 'giveaway' | 'raffle';
  endDate: string | null;
}

export async function sendConfirmationEmail({
  to,
  name,
  city,
  campaignName,
  campaignType,
  endDate,
}: SendConfirmationEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured, skipping email');
    return true;
  }

  const isGiveaway = campaignType !== 'raffle';

  const subject = isGiveaway
    ? "You're signed up for OHB tickets!"
    : "You're entered to win OHB tickets!";

  const heading = isGiveaway ? "You're Signed Up!" : "You're Entered!";

  const introLine = isGiveaway
    ? `You're signed up for free tickets to <strong>Our Hero, Balthazar</strong> in ${city} — while supplies last.`
    : `You're entered to win free tickets to <strong>Our Hero, Balthazar</strong> in ${city}!`;

  const detailLine = isGiveaway
    ? `<strong>How it works:</strong> Tickets are first-come, first-served while supplies last. We'll email you if you're eligible to receive tickets.`
    : endDate
      ? `<strong>Winners announced:</strong> ${endDate}`
      : `<strong>Winners:</strong> We'll notify you when winners are selected`;

  const closingLine = isGiveaway
    ? "We'll email you if your tickets are available. Thanks for your interest!"
    : "We'll email you if you're selected. Good luck!";

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ff3600; padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">
              Our Hero, Balthazar
            </h1>
          </div>

          <div style="padding: 30px; background: #000; color: #fff;">
            <h2 style="color: #ff3600; margin-top: 0;">${heading}</h2>

            <p style="font-size: 16px; line-height: 1.6;">
              Hi ${name},
            </p>

            <p style="font-size: 16px; line-height: 1.6;">
              ${introLine}
            </p>

            <div style="background: #1a1a1a; padding: 20px; margin: 20px 0; border-left: 4px solid #ff3600;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Campaign:</strong> ${campaignName}<br>
                ${detailLine}
              </p>
            </div>

            <p style="font-size: 16px; line-height: 1.6;">
              ${closingLine}
            </p>

            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              — The WG Pictures Team
            </p>
          </div>

          <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>
              <a href="https://ourherobalthazar.com" style="color: #ff3600;">ourherobalthazar.com</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
}

interface SendSelectionEmailParams {
  to: string;
  name: string;
  city: string;
  campaignName: string;
  campaignType: 'giveaway' | 'raffle';
  replyUrl: string;
  replyToEmail: string;
  isResend?: boolean;
}

export async function sendSelectionEmail({
  to,
  name,
  city,
  campaignName,
  campaignType,
  replyUrl,
  replyToEmail,
  isResend = false,
}: SendSelectionEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured, skipping selection email');
    return true;
  }

  const isGiveaway = campaignType !== 'raffle';

  const baseSubject = isGiveaway
    ? 'Your OHB tickets are ready to claim'
    : "Good news — you've been selected for OHB tickets";
  const subject = isResend ? `${baseSubject} (resend)` : baseSubject;

  const heading = isGiveaway ? 'Your Tickets Are Ready' : "You've Been Selected";

  const introLine = isGiveaway
    ? `Your free tickets to <strong>Our Hero, Balthazar</strong> in ${city} are ready to claim — while supplies last.`
    : `You've been selected to receive free tickets to <strong>Our Hero, Balthazar</strong> in ${city}.`;

  const instructionLine = isGiveaway
    ? `Reply with how many tickets you'd like and which showtimes work. Pick multiple options so we can still book you if one sells out.`
    : `Reply with how many tickets you'd like and which showtimes work for you. The more options you pick, the more likely we can book one before it sells out.`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: replyToEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ff3600; padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">
              Our Hero, Balthazar
            </h1>
          </div>

          <div style="padding: 30px; background: #000; color: #fff;">
            <h2 style="color: #ff3600; margin-top: 0;">${heading}</h2>

            <p style="font-size: 16px; line-height: 1.6;">
              Hi ${name},
            </p>

            <p style="font-size: 16px; line-height: 1.6;">
              ${introLine}
            </p>

            <p style="font-size: 16px; line-height: 1.6;">
              ${instructionLine}
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${replyUrl}" style="background: #ff3600; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                Claim My Tickets
              </a>
            </div>

            <p style="font-size: 14px; color: #999; line-height: 1.6;">
              Campaign: ${campaignName}<br>
              Please reply within 48 hours — otherwise we may offer the tickets to someone else.
            </p>

            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              — The WG Pictures Team
            </p>
          </div>

          <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>
              If the button doesn't work, paste this link in your browser:<br>
              <a href="${replyUrl}" style="color: #ff3600;">${replyUrl}</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending selection email:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending selection email:', error);
    return false;
  }
}

interface SendFulfillmentNotificationParams {
  to: string;
  cc: string[];
  entrantName: string;
  entrantEmail: string;
  entrantPhone: string;
  city: string;
  campaignName: string;
  requestedTickets: number;
  requestedShowtimes: Showtime[];
  adminUrl: string;
}

export async function sendFulfillmentNotification({
  to,
  cc,
  entrantName,
  entrantEmail,
  entrantPhone,
  city,
  campaignName,
  requestedTickets,
  requestedShowtimes,
  adminUrl,
}: SendFulfillmentNotificationParams): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured, skipping fulfillment notification');
    return true;
  }

  const subject = `Ticket request — ${entrantName} (${city}) — ${requestedTickets} ticket${requestedTickets === 1 ? '' : 's'}`;

  const showtimesHtml = requestedShowtimes.length
    ? `<ol style="padding-left: 20px;">${requestedShowtimes
        .map(
          (s) =>
            `<li style="margin-bottom: 8px;">${s.theater} — ${s.date} ${s.time} <em style="color:#888;">(${s.eventType})</em><br><a href="${s.ticketLink}" style="color:#ff3600;">Buy link</a></li>`
        )
        .join('')}</ol>`
    : `<p><em>Entrant had no showtimes available at reply time and opted to wait for us to reach out.</em></p>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      cc,
      replyTo: entrantEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
          <div style="background: #ff3600; padding: 20px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 2px;">
              New Ticket Request
            </h1>
          </div>

          <div style="padding: 24px; background: #111; color: #fff;">
            <div style="background: #3a1d00; border: 1px solid #ff3600; padding: 14px 16px; margin: 0 0 20px;">
              <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                <strong style="color:#ff3600;">Before you buy anything:</strong> open the admin portal and click <strong>Mark Fulfilled</strong> on this entry first. This claims the request so no one else double-buys tickets. Then purchase and send the screenshot.
              </p>
            </div>

            <h2 style="color:#ff3600; margin-top: 0; font-size: 18px;">Entrant</h2>
            <p style="font-size: 14px; line-height: 1.6;">
              <strong>${entrantName}</strong><br>
              <a href="mailto:${entrantEmail}" style="color:#ff3600;">${entrantEmail}</a><br>
              ${entrantPhone}<br>
              ${city}
            </p>

            <h2 style="color:#ff3600; font-size: 18px;">Request</h2>
            <p style="font-size: 14px; line-height: 1.6;">
              Campaign: ${campaignName}<br>
              Tickets: <strong>${requestedTickets}</strong>
            </p>

            <h2 style="color:#ff3600; font-size: 18px;">Acceptable showtimes</h2>
            ${showtimesHtml}

            <div style="margin-top: 28px;">
              <a href="${adminUrl}" style="background:#ff3600;color:#fff;padding:12px 20px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:13px;">
                Open admin
              </a>
            </div>

            <p style="font-size:12px;color:#888;margin-top: 24px;line-height:1.6;">
              Reply-to on this email goes directly to the entrant — so replying here sends them the ticket screenshot. Mark Fulfilled in admin once you've sent tickets.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending fulfillment notification:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending fulfillment notification:', error);
    return false;
  }
}
