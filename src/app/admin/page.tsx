'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

type Status = 'pending' | 'winner' | 'fulfilled' | 'declined';

interface Showtime {
  theater: string;
  date: string;
  time: string;
  eventType?: string;
  ticketLink?: string | null;
  city?: string;
  soldOut?: boolean;
}

interface Campaign {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  campaign_type: 'giveaway' | 'raffle' | string;
  starts_at: string;
  ends_at: string | null;
  prize_description: string;
  winner_count: number;
  eligible_cities: string[];
  google_sheet_id: string | null;
  google_sheet_tab: string | null;
  fulfillment_email: string | null;
  fulfillment_cc_emails: string | null;
  is_active: boolean;
  created_at: string;
  entries?: { count: number }[];
}

interface Entry {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  age_confirmed: boolean;
  ip_address: string | null;
  user_agent: string | null;
  synced_to_sheet_at: string | null;
  status: Status;
  selected_at: string | null;
  reply_token: string | null;
  requested_tickets: number | null;
  requested_showtimes: Showtime[] | null;
  replied_at: string | null;
  booked_showtime: Showtime | null;
  fulfilled_at: string | null;
  notes: string | null;
  created_at: string;
}

interface CampaignWithEntries extends Omit<Campaign, 'entries'> {
  entries: Entry[];
}

type FilterKey = 'all' | 'pending' | 'winner' | 'fulfilled' | 'declined';

const STATUS_STYLES: Record<Status, string> = {
  pending: 'bg-gray-700 text-gray-300',
  winner: 'bg-[#ff3600] text-white',
  fulfilled: 'bg-green-700 text-white',
  declined: 'bg-gray-800 text-gray-500',
};

function winnerLabel(c: Pick<Campaign, 'campaign_type'>, form: 'button' | 'badge' = 'button') {
  const isGiveaway = c.campaign_type !== 'raffle';
  if (form === 'badge') return isGiveaway ? 'Recipient' : 'Winner';
  return isGiveaway ? 'Select as Recipient' : 'Select as Winner';
}

function statusLabel(s: Status, c: Pick<Campaign, 'campaign_type'>) {
  if (s === 'winner') return winnerLabel(c, 'badge');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toast(msg: string, kind: 'ok' | 'err' | 'info' = 'ok') {
  if (typeof window === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;bottom:24px;right:24px;padding:12px 16px;z-index:9999;font-size:13px;color:#fff;background:${
    kind === 'ok' ? '#15803d' : kind === 'err' ? '#b91c1c' : '#262626'
  };box-shadow:0 6px 24px rgba(0,0,0,0.4);`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithEntries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = {
    slug: '',
    name: '',
    description: '',
    campaign_type: 'giveaway' as 'giveaway' | 'raffle',
    starts_at: '',
    ends_at: '',
    prize_description: '2 free tickets to Our Hero, Balthazar',
    winner_count: 10,
    eligible_cities: 'New York, Los Angeles',
    fulfillment_email: '',
    fulfillment_cc_emails: '',
    is_active: false,
  };
  const [formData, setFormData] = useState(emptyForm);

  // Entries view state
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [fulfillFormFor, setFulfillFormFor] = useState<string | null>(null);
  const [fulfillChoice, setFulfillChoice] = useState<string>('');
  const [fulfillManual, setFulfillManual] = useState({ theater: '', date: '', time: '' });
  const [fulfillNotes, setFulfillNotes] = useState('');

  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const notesPending = useRef<Record<string, string>>({});
  const [notesStatus, setNotesStatus] = useState<Record<string, 'saving' | 'saved' | ''>>({});

  const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${password}`,
    }),
    [password]
  );

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/campaigns', { headers: authHeaders });
      if (res.status === 401) {
        setAuthenticated(false);
        setError('Invalid password');
        return;
      }
      const data = await res.json();
      setCampaigns(data);
      setAuthenticated(true);
      setError(null);
    } catch {
      setError('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const fetchCampaignDetails = useCallback(
    async (id: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetch(`/api/admin/campaigns/${id}`, { headers: authHeaders });
        const data = await res.json();
        setSelectedCampaign((prev) => {
          if (!prev || prev.id !== data.id) return data;
          return data;
        });
      } catch {
        if (!opts?.silent) setError('Failed to fetch campaign details');
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [authHeaders]
  );

  // Poll the open campaign every 3s for cross-admin sync.
  useEffect(() => {
    if (!selectedCampaign?.id) return;
    const id = selectedCampaign.id;
    const interval = setInterval(() => {
      fetchCampaignDetails(id, { silent: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedCampaign?.id, fetchCampaignDetails]);

  const startEditing = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setFormData({
      slug: campaign.slug,
      name: campaign.name,
      description: campaign.description || '',
      campaign_type: campaign.campaign_type === 'raffle' ? 'raffle' : 'giveaway',
      starts_at: toLocalInput(campaign.starts_at),
      ends_at: toLocalInput(campaign.ends_at),
      prize_description: campaign.prize_description,
      winner_count: campaign.winner_count,
      eligible_cities: campaign.eligible_cities.join(', '),
      fulfillment_email: campaign.fulfillment_email || '',
      fulfillment_cc_emails: campaign.fulfillment_cc_emails || '',
      is_active: campaign.is_active,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const submitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        ends_at: formData.ends_at || null,
        fulfillment_email: formData.fulfillment_email.trim() || null,
        fulfillment_cc_emails: formData.fulfillment_cc_emails.trim() || null,
        eligible_cities: formData.eligible_cities
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      };

      const url = editingId ? `/api/admin/campaigns/${editingId}` : '/api/admin/campaigns';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      cancelForm();
      fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaignActive = async (campaign: Campaign) => {
    try {
      if (!campaign.is_active) {
        for (const c of campaigns) {
          if (c.is_active) {
            await fetch(`/api/admin/campaigns/${c.id}`, {
              method: 'PATCH',
              headers: authHeaders,
              body: JSON.stringify({ is_active: false }),
            });
          }
        }
      }
      await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ is_active: !campaign.is_active }),
      });
      fetchCampaigns();
    } catch {
      setError('Failed to update campaign');
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign and all its entries?')) return;
    try {
      await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE', headers: authHeaders });
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch {
      setError('Failed to delete campaign');
    }
  };

  const markBusy = (id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectWinner = async (entry: Entry) => {
    if (!selectedCampaign) return;
    const label = winnerLabel(selectedCampaign, 'button');
    const confirmed = confirm(
      `${label}: ${entry.name}?\n\nThis will email ${entry.email} with a reply link so they can tell us how many tickets they want and which showtimes work. Once they reply, the fulfiller will be notified to prepare tickets.\n\nYou can undo the status change, but the email will already have been sent.`
    );
    if (!confirmed) return;

    markBusy(entry.id, true);
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}/select`, {
        method: 'PATCH',
        headers: authHeaders,
      });
      const body = await res.json();
      if (!res.ok) {
        toast(body?.error || 'Failed to select', 'err');
        return;
      }
      if (body.emailSent) toast(`Email sent to ${entry.email}`, 'ok');
      else toast('Status updated but email failed — use Copy reply link', 'err');
      await fetchCampaignDetails(selectedCampaign.id, { silent: true });
    } finally {
      markBusy(entry.id, false);
    }
  };

  const resendEmail = async (entry: Entry) => {
    if (!selectedCampaign) return;
    markBusy(entry.id, true);
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}/resend-email`, {
        method: 'POST',
        headers: authHeaders,
      });
      const body = await res.json();
      if (!res.ok) {
        toast(body?.error || 'Failed to resend', 'err');
        return;
      }
      if (body.emailSent) toast('Resent selection email', 'ok');
      else toast('Resend failed', 'err');
      await fetchCampaignDetails(selectedCampaign.id, { silent: true });
    } finally {
      markBusy(entry.id, false);
    }
  };

  const invalidateLink = async (entry: Entry) => {
    if (!selectedCampaign) return;
    if (
      !confirm(
        'Invalidate the current reply link for this entry? A new link will be generated. Any previous reply link will stop working, and any reply data will be cleared.'
      )
    )
      return;
    markBusy(entry.id, true);
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ rotateToken: true }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast(body?.error || 'Failed to invalidate', 'err');
        return;
      }
      toast('Reply link rotated', 'ok');
      await fetchCampaignDetails(selectedCampaign.id, { silent: true });
    } finally {
      markBusy(entry.id, false);
    }
  };

  const undoSelection = async (entry: Entry) => {
    if (!selectedCampaign) return;
    if (
      !confirm(
        'The selection email has already been sent. Undo will flip the status back to Pending and invalidate the reply link, but the email is not recalled. Continue?'
      )
    )
      return;
    markBusy(entry.id, true);
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'pending', rotateToken: true }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast(body?.error || 'Failed to undo', 'err');
        return;
      }
      toast('Reverted to Pending', 'info');
      await fetchCampaignDetails(selectedCampaign.id, { silent: true });
    } finally {
      markBusy(entry.id, false);
    }
  };

  const openFulfillForm = (entry: Entry) => {
    setFulfillFormFor(entry.id);
    setFulfillChoice('');
    setFulfillManual({ theater: '', date: '', time: '' });
    setFulfillNotes(entry.notes || '');
  };

  const submitFulfill = async (entry: Entry) => {
    if (!selectedCampaign) return;

    let booked: Showtime | null = null;
    if (fulfillChoice === '__manual__') {
      if (!fulfillManual.theater || !fulfillManual.date || !fulfillManual.time) {
        toast('Fill in theater, date, and time.', 'err');
        return;
      }
      booked = { ...fulfillManual, ticketLink: null };
    } else if (fulfillChoice) {
      const [theater, date, time] = fulfillChoice.split('|');
      const match = (entry.requested_showtimes || []).find(
        (s) => s.theater === theater && s.date === date && s.time === time
      );
      booked = match
        ? { theater, date, time, ticketLink: match.ticketLink || null }
        : { theater, date, time, ticketLink: null };
    } else {
      toast('Pick a showtime.', 'err');
      return;
    }

    markBusy(entry.id, true);
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          status: 'fulfilled',
          booked_showtime: booked,
          notes: fulfillNotes || entry.notes || '',
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast(body?.error || 'Failed to mark fulfilled', 'err');
        return;
      }
      toast('Marked fulfilled', 'ok');
      setFulfillFormFor(null);
      await fetchCampaignDetails(selectedCampaign.id, { silent: true });
    } finally {
      markBusy(entry.id, false);
    }
  };

  const unmarkFulfilled = async (entry: Entry) => {
    if (!selectedCampaign) return;
    if (!confirm('Unmark this entry as fulfilled? It will go back to Winner status.')) return;
    markBusy(entry.id, true);
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'winner' }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast(body?.error || 'Failed to unmark', 'err');
        return;
      }
      toast('Reverted to Winner', 'info');
      await fetchCampaignDetails(selectedCampaign.id, { silent: true });
    } finally {
      markBusy(entry.id, false);
    }
  };

  const saveNotes = async (entryId: string) => {
    const value = notesPending.current[entryId];
    if (value === undefined) return;
    setNotesStatus((s) => ({ ...s, [entryId]: 'saving' }));
    try {
      const res = await fetch(`/api/admin/entries/${entryId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ notes: value }),
      });
      if (res.ok) {
        setNotesStatus((s) => ({ ...s, [entryId]: 'saved' }));
        setTimeout(() => {
          setNotesStatus((s) => ({ ...s, [entryId]: '' }));
        }, 1200);
      } else {
        setNotesStatus((s) => ({ ...s, [entryId]: '' }));
      }
    } catch {
      setNotesStatus((s) => ({ ...s, [entryId]: '' }));
    }
  };

  const onNotesChange = (entryId: string, value: string) => {
    notesPending.current[entryId] = value;
    setSelectedCampaign((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) => (e.id === entryId ? { ...e, notes: value } : e)),
          }
        : prev
    );
    clearTimeout(notesTimers.current[entryId]);
    notesTimers.current[entryId] = setTimeout(() => saveNotes(entryId), 800);
  };

  useEffect(() => {
    const flush = () => {
      Object.keys(notesTimers.current).forEach((id) => {
        clearTimeout(notesTimers.current[id]);
        saveNotes(id);
      });
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCampaigns();
  };

  const copyToClipboard = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(ok, 'ok');
    } catch {
      toast('Could not copy', 'err');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <h1 className="heading text-2xl text-white mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const entries = selectedCampaign?.entries || [];
  const counts = {
    total: entries.length,
    pending: entries.filter((e) => e.status === 'pending').length,
    winner: entries.filter((e) => e.status === 'winner').length,
    fulfilled: entries.filter((e) => e.status === 'fulfilled').length,
    declined: entries.filter((e) => e.status === 'declined').length,
  };
  const filteredEntries = entries
    .filter((e) => filter === 'all' || e.status === filter)
    .filter((e) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q)
      );
    });

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="heading text-2xl text-white">Campaign Admin</h1>
          <button
            onClick={() => (showForm ? cancelForm() : setShowForm(true))}
            className="btn-primary"
          >
            {showForm ? 'Cancel' : 'New Campaign'}
          </button>
        </div>

        {error && <p className="error-message mb-4">{error}</p>}

        {showForm && (
          <div className="bg-[#111] p-6 mb-8">
            <h2 className="heading text-xl text-white mb-4">
              {editingId ? 'Edit Campaign' : 'Create Campaign'}
            </h2>
            <form onSubmit={submitCampaign} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm">Slug (URL-friendly)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="nyc-premiere"
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="NYC Premiere Giveaway"
                  required
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Win tickets to the NYC premiere!"
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Campaign Type</label>
                <div className="flex gap-4 mt-2">
                  <label className="checkbox-container text-white">
                    <input
                      type="radio"
                      name="campaign_type"
                      value="giveaway"
                      checked={formData.campaign_type === 'giveaway'}
                      onChange={() => setFormData({ ...formData, campaign_type: 'giveaway' })}
                    />
                    <span>Giveaway (while supplies last)</span>
                  </label>
                  <label className="checkbox-container text-white">
                    <input
                      type="radio"
                      name="campaign_type"
                      value="raffle"
                      checked={formData.campaign_type === 'raffle'}
                      onChange={() => setFormData({ ...formData, campaign_type: 'raffle' })}
                    />
                    <span>Raffle / Contest (winners drawn)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Start Date</label>
                <input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">End Date (optional)</label>
                <input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Prize Description</label>
                <input
                  type="text"
                  value={formData.prize_description}
                  onChange={(e) => setFormData({ ...formData, prize_description: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">
                  {formData.campaign_type === 'giveaway' ? 'Available Slots' : 'Winner Count'}
                </label>
                <input
                  type="number"
                  value={formData.winner_count}
                  onChange={(e) =>
                    setFormData({ ...formData, winner_count: parseInt(e.target.value) })
                  }
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Eligible Cities (comma-separated)</label>
                <input
                  type="text"
                  value={formData.eligible_cities}
                  onChange={(e) =>
                    setFormData({ ...formData, eligible_cities: e.target.value })
                  }
                  placeholder="New York, Los Angeles, Chicago"
                  className="input"
                />
              </div>

              <div className="col-span-2 pt-2 border-t border-gray-800">
                <h3 className="heading text-white text-sm mb-2">Fulfillment routing</h3>
                <p className="text-gray-500 text-xs mb-3">
                  When a winner replies with their ticket request, a notification goes here.
                  Leave blank to use the default (<code className="text-gray-400">tn@wgpictures.com</code>).
                  <br />
                  <code className="text-gray-400">contact@wgpictures.com</code> is always CC&rsquo;d.
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Fulfillment email (To)</label>
                <input
                  type="email"
                  value={formData.fulfillment_email}
                  onChange={(e) =>
                    setFormData({ ...formData, fulfillment_email: e.target.value })
                  }
                  placeholder="tn@wgpictures.com (default)"
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">
                  Additional CC emails (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.fulfillment_cc_emails}
                  onChange={(e) =>
                    setFormData({ ...formData, fulfillment_cc_emails: e.target.value })
                  }
                  placeholder="ops@wgpictures.com, approver@wgpictures.com"
                  className="input"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Added on top of the always-CC (contact@wgpictures.com).
                </p>
              </div>

              <div className="col-span-2">
                <label className="checkbox-container text-white">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                  <span>Activate immediately (will deactivate other campaigns)</span>
                </label>
              </div>
              <div className="col-span-2">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={`bg-[#111] p-4 border-l-4 ${
                campaign.is_active ? 'border-[#ff3600]' : 'border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="heading text-lg text-white">{campaign.name}</h3>
                  <p className="text-gray-500 text-sm">
                    /{campaign.slug} ·{' '}
                    {campaign.campaign_type === 'raffle' ? 'Raffle' : 'Giveaway'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs ${
                    campaign.is_active
                      ? 'bg-[#ff3600] text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {campaign.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="text-gray-400 text-sm mb-4">
                <p>
                  {new Date(campaign.starts_at).toLocaleDateString()}
                  {campaign.ends_at
                    ? ` - ${new Date(campaign.ends_at).toLocaleDateString()}`
                    : ' (No end date)'}
                </p>
                <p>{campaign.entries?.[0]?.count || 0} entries</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => fetchCampaignDetails(campaign.id)}
                  className="text-white text-sm underline"
                >
                  View Entries
                </button>
                <button
                  onClick={() => startEditing(campaign)}
                  className="text-white text-sm underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleCampaignActive(campaign)}
                  className="text-[#ff3600] text-sm underline"
                >
                  {campaign.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteCampaign(campaign.id)}
                  className="text-red-500 text-sm underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedCampaign && (
          <div className="mt-8 bg-[#111] p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading text-xl text-white">
                {selectedCampaign.name} — Entries ({counts.total})
              </h2>
              <button onClick={() => setSelectedCampaign(null)} className="text-gray-400">
                Close
              </button>
            </div>

            <div className="bg-[#3a1d00] border border-[#ff3600] p-3 mb-4 text-sm text-gray-200">
              <strong className="text-[#ff3600]">Before sending tickets:</strong>{' '}
              open an entry and click <strong>Mark Fulfilled</strong> first. This claims it
              so another admin doesn&rsquo;t double-buy. Then send the ticket screenshot by
              replying to the fulfillment email.
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
              <span className="text-gray-400">
                {counts.total} total · {counts.winner} winners · {counts.fulfilled} fulfilled · {counts.pending} pending
              </span>
              <span className="text-gray-600 ml-auto text-xs">Auto-syncing every 3s</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              {([
                ['all', `All (${counts.total})`],
                ['pending', `Pending (${counts.pending})`],
                ['winner', `${statusLabel('winner', selectedCampaign)}s (${counts.winner})`],
                ['fulfilled', `Fulfilled (${counts.fulfilled})`],
                ['declined', `Declined (${counts.declined})`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as FilterKey)}
                  className={`px-3 py-1 border ${
                    filter === key
                      ? 'border-[#ff3600] bg-[#ff3600]/10 text-white'
                      : 'border-gray-700 text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, city"
                className="input ml-auto max-w-xs text-xs"
              />
            </div>

            {filteredEntries.length === 0 ? (
              <p className="text-gray-400">No entries match.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="py-2 pr-2 w-8"></th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Email</th>
                      <th className="py-2 pr-2">Phone</th>
                      <th className="py-2 pr-2">City</th>
                      <th className="py-2 pr-2">Submitted</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
                      const expanded = expandedId === entry.id;
                      const busy = busyIds.has(entry.id);
                      const appUrl =
                        typeof window !== 'undefined' ? window.location.origin : '';
                      const replyUrl = entry.reply_token
                        ? `${appUrl}/freetickets/reply/${entry.reply_token}`
                        : null;

                      return (
                        <React.Fragment key={entry.id}>
                          <tr className="text-white border-b border-gray-800">
                            <td className="py-2 pr-2 align-top">
                              <button
                                onClick={() =>
                                  setExpandedId(expanded ? null : entry.id)
                                }
                                className="text-gray-500 hover:text-white"
                                aria-label="Expand row"
                              >
                                {expanded ? '▾' : '▸'}
                              </button>
                            </td>
                            <td className="py-2 pr-2 align-top">
                              <span
                                className={`px-2 py-0.5 text-xs ${STATUS_STYLES[entry.status]}`}
                              >
                                {statusLabel(entry.status, selectedCampaign)}
                              </span>
                            </td>
                            <td className="py-2 pr-2 align-top">{entry.name}</td>
                            <td className="py-2 pr-2 align-top text-xs">{entry.email}</td>
                            <td className="py-2 pr-2 align-top text-xs">{entry.phone}</td>
                            <td className="py-2 pr-2 align-top text-xs">{entry.city}</td>
                            <td className="py-2 pr-2 align-top text-xs">
                              {new Date(entry.created_at).toLocaleString()}
                            </td>
                            <td className="py-2 pr-2 align-top">
                              <div className="flex flex-wrap gap-2">
                                {entry.status === 'pending' && (
                                  <button
                                    onClick={() => selectWinner(entry)}
                                    disabled={busy}
                                    className="bg-[#ff3600] text-white px-2 py-1 text-xs disabled:opacity-50"
                                  >
                                    {busy ? 'Working…' : winnerLabel(selectedCampaign, 'button')}
                                  </button>
                                )}
                                {entry.status === 'winner' && (
                                  <>
                                    <button
                                      onClick={() => openFulfillForm(entry)}
                                      disabled={busy}
                                      className="bg-green-700 text-white px-2 py-1 text-xs disabled:opacity-50"
                                    >
                                      Mark Fulfilled
                                    </button>
                                    <button
                                      onClick={() => resendEmail(entry)}
                                      disabled={busy}
                                      className="text-[#ff3600] text-xs underline disabled:opacity-50"
                                    >
                                      Resend email
                                    </button>
                                    {replyUrl && (
                                      <button
                                        onClick={() =>
                                          copyToClipboard(replyUrl, 'Copied reply link')
                                        }
                                        className="text-gray-300 text-xs underline"
                                      >
                                        Copy reply link
                                      </button>
                                    )}
                                    <button
                                      onClick={() => invalidateLink(entry)}
                                      disabled={busy}
                                      className="text-gray-400 text-xs underline disabled:opacity-50"
                                    >
                                      Invalidate link
                                    </button>
                                    <button
                                      onClick={() => undoSelection(entry)}
                                      disabled={busy}
                                      className="text-gray-500 text-xs underline disabled:opacity-50"
                                    >
                                      Undo
                                    </button>
                                  </>
                                )}
                                {entry.status === 'fulfilled' && (
                                  <button
                                    onClick={() => unmarkFulfilled(entry)}
                                    disabled={busy}
                                    className="text-gray-500 text-xs underline disabled:opacity-50"
                                  >
                                    Unmark
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-[#0a0a0a] border-b border-gray-800">
                              <td colSpan={8} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                                  <div>
                                    <div className="text-gray-500 mb-1">Metadata</div>
                                    <div>
                                      Age confirmed:{' '}
                                      <span className="text-white">
                                        {entry.age_confirmed ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                    <div>
                                      Sheet synced:{' '}
                                      <span className="text-white">
                                        {entry.synced_to_sheet_at
                                          ? new Date(entry.synced_to_sheet_at).toLocaleString()
                                          : 'No'}
                                      </span>
                                    </div>
                                    <div>IP: {entry.ip_address || '—'}</div>
                                    <div className="truncate">
                                      User agent: {entry.user_agent || '—'}
                                    </div>
                                    {replyUrl && (
                                      <div className="mt-2">
                                        <div className="text-gray-500 mb-1">Reply link</div>
                                        <div className="flex items-center gap-2">
                                          <code className="bg-[#161616] px-2 py-1 truncate max-w-xs">
                                            {replyUrl}
                                          </code>
                                          <button
                                            onClick={() =>
                                              copyToClipboard(replyUrl, 'Copied')
                                            }
                                            className="text-[#ff3600] underline"
                                          >
                                            Copy
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <div className="text-gray-500 mb-1">Winner flow</div>
                                    <div>
                                      Selected:{' '}
                                      <span className="text-white">
                                        {entry.selected_at
                                          ? new Date(entry.selected_at).toLocaleString()
                                          : '—'}
                                      </span>
                                    </div>
                                    <div>
                                      Replied:{' '}
                                      <span className="text-white">
                                        {entry.replied_at
                                          ? new Date(entry.replied_at).toLocaleString()
                                          : '—'}
                                      </span>
                                    </div>
                                    {entry.replied_at && (
                                      <>
                                        <div>
                                          Requested tickets:{' '}
                                          <span className="text-white">
                                            {entry.requested_tickets}
                                          </span>
                                        </div>
                                        <div className="mt-1">
                                          <div className="text-gray-500">
                                            Acceptable showtimes:
                                          </div>
                                          <ul className="list-disc pl-5">
                                            {(entry.requested_showtimes || []).map(
                                              (s, i) => (
                                                <li key={i}>
                                                  {s.theater} — {s.date} {s.time}
                                                </li>
                                              )
                                            )}
                                            {(entry.requested_showtimes || []).length ===
                                              0 && (
                                              <li className="list-none text-gray-500 italic">
                                                Entrant opted to wait for us to reach out.
                                              </li>
                                            )}
                                          </ul>
                                        </div>
                                      </>
                                    )}
                                    {entry.status === 'fulfilled' && entry.booked_showtime && (
                                      <div className="mt-2">
                                        <div className="text-gray-500">Booked:</div>
                                        <div className="text-white">
                                          {entry.booked_showtime.theater} —{' '}
                                          {entry.booked_showtime.date}{' '}
                                          {entry.booked_showtime.time}
                                        </div>
                                        <div>
                                          Fulfilled:{' '}
                                          {entry.fulfilled_at
                                            ? new Date(entry.fulfilled_at).toLocaleString()
                                            : '—'}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="md:col-span-2">
                                    <div className="text-gray-500 mb-1 flex justify-between">
                                      <span>Admin notes</span>
                                      <span className="text-gray-600">
                                        {notesStatus[entry.id] === 'saving' && 'saving…'}
                                        {notesStatus[entry.id] === 'saved' && 'saved'}
                                      </span>
                                    </div>
                                    <textarea
                                      value={entry.notes || ''}
                                      onChange={(e) => onNotesChange(entry.id, e.target.value)}
                                      rows={2}
                                      className="input text-xs"
                                      placeholder="Internal notes (auto-saved)"
                                    />
                                  </div>

                                  {fulfillFormFor === entry.id && (
                                    <div className="md:col-span-2 bg-[#161616] p-3 mt-2">
                                      <div className="text-gray-300 text-xs mb-2">
                                        <strong className="text-[#ff3600]">Mark Fulfilled</strong>{' '}
                                        — click this first to claim the request, then send
                                        tickets so nobody double-sends.
                                      </div>
                                      <label className="text-gray-500 text-xs">
                                        Which showtime did you book?
                                      </label>
                                      <select
                                        value={fulfillChoice}
                                        onChange={(e) => setFulfillChoice(e.target.value)}
                                        className="input text-xs mt-1"
                                      >
                                        <option value="">Select…</option>
                                        {(entry.requested_showtimes || []).map((s, i) => (
                                          <option
                                            key={i}
                                            value={`${s.theater}|${s.date}|${s.time}`}
                                          >
                                            {s.theater} — {s.date} {s.time}
                                          </option>
                                        ))}
                                        <option value="__manual__">Other / manual entry</option>
                                      </select>
                                      {fulfillChoice === '__manual__' && (
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                          <input
                                            type="text"
                                            value={fulfillManual.theater}
                                            onChange={(e) =>
                                              setFulfillManual({
                                                ...fulfillManual,
                                                theater: e.target.value,
                                              })
                                            }
                                            placeholder="Theater"
                                            className="input text-xs"
                                          />
                                          <input
                                            type="text"
                                            value={fulfillManual.date}
                                            onChange={(e) =>
                                              setFulfillManual({
                                                ...fulfillManual,
                                                date: e.target.value,
                                              })
                                            }
                                            placeholder="YYYY-MM-DD"
                                            className="input text-xs"
                                          />
                                          <input
                                            type="text"
                                            value={fulfillManual.time}
                                            onChange={(e) =>
                                              setFulfillManual({
                                                ...fulfillManual,
                                                time: e.target.value,
                                              })
                                            }
                                            placeholder="7:30 PM"
                                            className="input text-xs"
                                          />
                                        </div>
                                      )}
                                      <label className="text-gray-500 text-xs mt-2 block">
                                        Notes (optional)
                                      </label>
                                      <textarea
                                        value={fulfillNotes}
                                        onChange={(e) => setFulfillNotes(e.target.value)}
                                        rows={2}
                                        className="input text-xs"
                                      />
                                      <div className="flex gap-2 mt-2">
                                        <button
                                          onClick={() => submitFulfill(entry)}
                                          disabled={busy}
                                          className="bg-green-700 text-white px-3 py-1 text-xs disabled:opacity-50"
                                        >
                                          Mark Fulfilled
                                        </button>
                                        <button
                                          onClick={() => setFulfillFormFor(null)}
                                          className="text-gray-400 text-xs underline"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
