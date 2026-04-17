import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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
      from: 'Our Hero Balthazar <noreply@ourherobalthazar.com>',
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
