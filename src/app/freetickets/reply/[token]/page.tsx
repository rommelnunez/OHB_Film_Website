'use client';

import { useState, useEffect, use } from 'react';

interface Showtime {
  theater: string;
  date: string;
  time: string;
  eventType: string;
  ticketLink: string;
  city: string;
  soldOut: boolean;
}

interface LoadResult {
  firstName: string;
  name: string;
  city: string;
  campaignName: string;
  campaignType: 'giveaway' | 'raffle';
  showtimes: Showtime[];
}

function showtimeKey(s: { theater: string; date: string; time: string }) {
  return `${s.theater}|${s.date}|${s.time}`;
}

function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function ReplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [data, setData] = useState<LoadResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alreadyReplied, setAlreadyReplied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tickets, setTickets] = useState(2);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [waitMode, setWaitMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/entry-reply/${token}`);
        const body = await res.json();
        if (res.ok) {
          setData(body);
        } else if (body?.alreadyReplied) {
          setAlreadyReplied(true);
          setData({
            firstName: (body.name || '').split(' ')[0],
            name: body.name,
            city: '',
            campaignName: '',
            campaignType: 'giveaway',
            showtimes: [],
          });
        } else {
          setLoadError(body?.error || 'This link is not valid.');
        }
      } catch {
        setLoadError('Could not load reply page. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const groupedByTheater = (() => {
    if (!data) return new Map<string, Showtime[]>();
    const map = new Map<string, Showtime[]>();
    for (const s of data.showtimes) {
      const arr = map.get(s.theater) || [];
      arr.push(s);
      map.set(s.theater, arr);
    }
    return map;
  })();

  const hasShowtimes = (data?.showtimes?.length || 0) > 0;
  const selectableCount = data?.showtimes.filter((s) => !s.soldOut).length || 0;

  const toggle = (s: Showtime) => {
    if (s.soldOut) return;
    const key = showtimeKey(s);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllForTheater = (theater: string) => {
    const rows = (groupedByTheater.get(theater) || []).filter((s) => !s.soldOut);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = rows.every((s) => next.has(showtimeKey(s)));
      if (allSelected) rows.forEach((s) => next.delete(showtimeKey(s)));
      else rows.forEach((s) => next.add(showtimeKey(s)));
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    if (!waitMode && selected.size === 0) {
      setSubmitError('Please pick at least one showtime.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const picks = waitMode
      ? []
      : data.showtimes
          .filter((s) => selected.has(showtimeKey(s)))
          .map((s) => ({ theater: s.theater, date: s.date, time: s.time, ticketLink: s.ticketLink }));

    try {
      const res = await fetch('/api/entry-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          requestedTickets: tickets,
          requestedShowtimes: picks,
          waitForContact: waitMode,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body?.error || 'Could not submit. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-gray-400">
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-xl mx-auto pt-16 text-center">
          <h1 className="heading text-2xl text-white mb-3">Link not valid</h1>
          <p className="text-gray-400">{loadError}</p>
          <p className="text-gray-500 text-sm mt-4">
            If you think this is a mistake, reply to your selection email.
          </p>
        </div>
      </div>
    );
  }

  if (alreadyReplied) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-xl mx-auto pt-16 text-center">
          <h1 className="heading text-2xl text-white mb-3">You&rsquo;re all set</h1>
          <p className="text-gray-400">
            Your preferences have already been submitted. We&rsquo;ll email you the tickets shortly.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Need to change something? Reply to your selection email.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-xl mx-auto pt-16 text-center">
          <h1 className="heading text-2xl text-white mb-3">We got it.</h1>
          <p className="text-gray-400">
            We&rsquo;ll email your tickets directly once they&rsquo;re booked. Thanks, {data?.firstName}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-[#ff3600] py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="heading text-3xl text-white">
            You&rsquo;re in, {data?.firstName} — let&rsquo;s get your tickets.
          </h1>
          <p className="text-white/80 mt-2 text-sm">{data?.campaignName}</p>
        </div>
      </div>

      <form onSubmit={submit} className="max-w-2xl mx-auto p-4 py-8 space-y-8 text-gray-200">
        <p>
          Pick how many tickets you&rsquo;d like and as many showtimes as would work for you.
          We&rsquo;ll lock one in and email you confirmation.
        </p>

        <div>
          <label className="text-gray-400 text-sm">Tickets</label>
          <select
            value={tickets}
            onChange={(e) => setTickets(parseInt(e.target.value, 10))}
            className="input mt-1"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-gray-400 text-sm">
              Showtimes in {data?.city} ({selectableCount} available)
            </label>
            {hasShowtimes && (
              <label className="text-gray-500 text-xs flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waitMode}
                  onChange={(e) => {
                    setWaitMode(e.target.checked);
                    if (e.target.checked) setSelected(new Set());
                  }}
                />
                I&rsquo;d rather wait — reach out to me
              </label>
            )}
          </div>

          {!hasShowtimes ? (
            <div className="bg-[#1a1a1a] p-4 text-gray-400 text-sm">
              No upcoming showtimes in your area right now. Submit anyway and
              we&rsquo;ll reach out as soon as more dates are announced.
            </div>
          ) : (
            <p className="text-gray-500 text-xs mb-3">
              Some showtimes may sell out before we get there. The more options you give us,
              the more likely we can book one for you.
            </p>
          )}

          <div className={`space-y-4 ${waitMode ? 'opacity-40 pointer-events-none' : ''}`}>
            {Array.from(groupedByTheater.entries()).map(([theater, rows]) => (
              <div key={theater} className="bg-[#111] p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="heading text-white text-sm">{theater}</h3>
                  <button
                    type="button"
                    onClick={() => toggleAllForTheater(theater)}
                    className="text-[#ff3600] text-xs underline"
                  >
                    Select all available
                  </button>
                </div>
                <ul className="divide-y divide-gray-800">
                  {rows.map((s) => {
                    const key = showtimeKey(s);
                    const isSelected = selected.has(key);
                    return (
                      <li key={key + s.eventType} className="py-2">
                        <label
                          className={`flex items-start gap-3 ${
                            s.soldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={s.soldOut}
                            checked={isSelected}
                            onChange={() => toggle(s)}
                            className="mt-1"
                          />
                          <div className="text-sm">
                            <div className="text-white">
                              {formatDate(s.date)} · {s.time}
                              {s.soldOut && (
                                <span className="ml-2 text-xs uppercase text-gray-500">
                                  Sold out
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400 text-xs">{s.eventType}</div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {submitError && <p className="error-message">{submitError}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Claim My Tickets'}
        </button>
      </form>
    </div>
  );
}
