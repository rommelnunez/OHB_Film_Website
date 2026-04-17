import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendConfirmationEmailParams {
  to: string;
  name: string;
  city: string;
  campaignName: string;
  endDate: string | null;
}

export async function sendConfirmationEmail({
  to,
  name,
  city,
  campaignName,
  endDate,
}: SendConfirmationEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn('Resend not configured, skipping email');
    return true;
  }

  const winnersAnnouncedText = endDate
    ? `<strong>Winners announced:</strong> ${endDate}`
    : `<strong>Winners:</strong> We'll notify you when winners are selected`;

  try {
    const { error } = await resend.emails.send({
      from: 'Our Hero Balthazar <noreply@ourherobalthazar.com>',
      to,
      subject: "You're entered to win OHB tickets!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ff3600; padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">
              Our Hero, Balthazar
            </h1>
          </div>

          <div style="padding: 30px; background: #000; color: #fff;">
            <h2 style="color: #ff3600; margin-top: 0;">You're Entered!</h2>

            <p style="font-size: 16px; line-height: 1.6;">
              Hi ${name},
            </p>

            <p style="font-size: 16px; line-height: 1.6;">
              You're entered to win free tickets to <strong>Our Hero, Balthazar</strong> in ${city}!
            </p>

            <div style="background: #1a1a1a; padding: 20px; margin: 20px 0; border-left: 4px solid #ff3600;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Campaign:</strong> ${campaignName}<br>
                ${winnersAnnouncedText}
              </p>
            </div>

            <p style="font-size: 16px; line-height: 1.6;">
              We'll email you if you're selected. Good luck!
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
