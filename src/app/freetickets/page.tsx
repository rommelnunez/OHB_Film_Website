'use client';

import { useState, useEffect, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface Campaign {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  campaign_type: 'giveaway' | 'raffle';
  prize_description: string;
  eligible_cities: string[];
  starts_at: string;
  ends_at: string | null;
  winner_count: number;
}

export default function FreeTicketsPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [rulesConfirmed, setRulesConfirmed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const captchaRef = useRef<HCaptcha>(null);

  // Fetch the active campaign
  useEffect(() => {
    async function fetchCampaign() {
      try {
        const res = await fetch('/api/campaigns/active');
        if (!res.ok) {
          if (res.status === 404) {
            setError('No active giveaway right now. Check back soon!');
          } else {
            setError('Failed to load giveaway');
          }
          return;
        }
        const data = await res.json();
        setCampaign(data);
      } catch {
        setError('Failed to load giveaway');
      } finally {
        setLoading(false);
      }
    }

    fetchCampaign();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!campaign) return;

    // TEMPORARILY DISABLED - captcha check
    // if (!captchaToken) {
    //   setSubmitError('Please complete the captcha');
    //   return;
    // }

    if (!ageConfirmed || !rulesConfirmed) {
      setSubmitError('Please confirm age and rules');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignSlug: campaign.slug,
          name,
          email,
          phone,
          city,
          ageConfirmed,
          captchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit entry');
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate countdown (only if end date is set)
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    if (!campaign || !campaign.ends_at) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(campaign.ends_at!);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [campaign]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="heading text-3xl text-white mb-4">Free Tickets</h1>
          <p className="text-gray-400 mb-8">{error || 'No active giveaway right now.'}</p>
          <a href="/" className="btn-primary inline-block">
            Back to OHB
          </a>
        </div>
      </div>
    );
  }

  if (submitted) {
    const isGiveaway = campaign.campaign_type !== 'raffle';
    const successHeading = isGiveaway ? "You're Signed Up!" : "You're Entered!";
    const notifyTail = isGiveaway
      ? 'if tickets are available for you.'
      : 'if you win.';
    const infoLabel = isGiveaway ? 'Next step' : 'Winners';
    const infoBody = isGiveaway
      ? "Tickets are first-come, first-served while supplies last. You'll hear from us by email if you're eligible."
      : "We'll notify you when winners are selected";

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-[#ff3600] p-8 mb-8">
            <h1 className="heading text-4xl text-white">{successHeading}</h1>
          </div>

          <div className="bg-[#111] p-8">
            <p className="text-white text-lg mb-6">
              Thanks for signing up, <strong>{name}</strong>!
            </p>

            <p className="text-gray-400 mb-6">
              We'll email you at <strong className="text-white">{email}</strong> {notifyTail}
            </p>

            {campaign.ends_at && !isGiveaway ? (
              <div className="border-l-4 border-[#ff3600] pl-4 text-left mb-6">
                <p className="text-sm text-gray-400">
                  <strong className="text-white">Winners announced:</strong>
                  <br />
                  {new Date(campaign.ends_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ) : (
              <div className="border-l-4 border-[#ff3600] pl-4 text-left mb-6">
                <p className="text-sm text-gray-400">
                  <strong className="text-white">{infoLabel}:</strong>
                  <br />
                  {infoBody}
                </p>
              </div>
            )}

            <a href="/" className="btn-primary inline-block w-full">
              Back to OHB
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isGiveaway = campaign.campaign_type !== 'raffle';
  const heroHeading = isGiveaway ? 'Free Tickets to' : 'Win Free Tickets to';
  const formHeading = isGiveaway ? 'Claim Your Tickets' : 'Enter to Win';
  const submitLabel = isGiveaway ? 'Sign Me Up' : 'Enter to Win';

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="bg-[#ff3600] py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="heading text-3xl md:text-5xl text-white mb-4">
            {heroHeading}
            <br />
            Our Hero, Balthazar
          </h1>

          <p className="text-white/90 text-lg mb-6">{campaign.prize_description}</p>

          {isGiveaway && (
            <p className="text-white/80 text-sm uppercase tracking-widest">
              While supplies last
            </p>
          )}

          {campaign.ends_at && countdown && !isGiveaway && (
            <div className="inline-block bg-black/20 px-6 py-3">
              <p className="text-white/80 text-sm">Ends in</p>
              <p className="text-white text-2xl font-bold tracking-wider">{countdown}</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-md mx-auto p-4 py-12">
        <div className="bg-[#111] p-8">
          <h2 className="heading text-2xl text-white mb-6">{formHeading}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <input
                type="tel"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="select"
              >
                <option value="">Select your city</option>
                {campaign.eligible_cities?.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 py-4">
              <label className="checkbox-container text-white">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  required
                />
                <span>I am 17 years or older</span>
              </label>

              <label className="checkbox-container text-white">
                <input
                  type="checkbox"
                  checked={rulesConfirmed}
                  onChange={(e) => setRulesConfirmed(e.target.checked)}
                  required
                />
                <span>
                  I agree to the{' '}
                  <a href="/freetickets/rules" className="text-[#ff3600] underline">
                    official rules
                  </a>
                </span>
              </label>
            </div>

            {/* TEMPORARILY DISABLED - hCaptcha widget
            <div className="py-2">
              <HCaptcha
                sitekey="6d9433e4-81de-4df6-9e46-4888ff7419b6"
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                ref={captchaRef}
                theme="dark"
              />
            </div>
            */}

            {submitError && <p className="error-message">{submitError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? 'Submitting...' : submitLabel}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          {isGiveaway ? (
            <>
              Tickets are first-come, first-served while supplies last.
              <br />
              Eligible entrants will be notified by email.
            </>
          ) : (
            <>
              {campaign.winner_count ? (
                <>{campaign.winner_count} winners will be selected.<br /></>
              ) : null}
              Winners notified by email.
            </>
          )}
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-6 text-center">
        <a href="/" className="text-gray-400 hover:text-white text-sm">
          ourherobalthazar.com
        </a>
      </div>
    </div>
  );
}
