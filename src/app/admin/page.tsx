'use client';

import { useState, useEffect } from 'react';

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
  created_at: string;
}

interface CampaignWithEntries extends Omit<Campaign, 'entries'> {
  entries: Entry[];
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithEntries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campaign form (create or edit)
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
    is_active: false,
  };
  const [formData, setFormData] = useState(emptyForm);

  const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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
      is_active: campaign.is_active,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${password}`,
  };

  const fetchCampaigns = async () => {
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
  };

  const fetchCampaignDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { headers: authHeaders });
      const data = await res.json();
      setSelectedCampaign(data);
    } catch {
      setError('Failed to fetch campaign details');
    } finally {
      setLoading(false);
    }
  };

  const submitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        ends_at: formData.ends_at || null,
        eligible_cities: formData.eligible_cities
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      };

      const url = editingId
        ? `/api/admin/campaigns/${editingId}`
        : '/api/admin/campaigns';
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
      // If activating, deactivate all others first
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
      await fetch(`/api/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch {
      setError('Failed to delete campaign');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCampaigns();
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

        {/* New Campaign Form */}
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
                <p className="text-gray-500 text-xs mt-1">
                  {formData.campaign_type === 'giveaway'
                    ? 'Entrants are notified by email if tickets are still available.'
                    : 'Winners are selected from entries after the campaign ends.'}
                </p>
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
                <p className="text-gray-500 text-xs mt-1">Leave empty for no end date</p>
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
                  onChange={(e) => setFormData({ ...formData, winner_count: parseInt(e.target.value) })}
                  className="input"
                />
                <p className="text-gray-500 text-xs mt-1">
                  {formData.campaign_type === 'giveaway'
                    ? 'Number of people who will receive tickets (first-come, first-served).'
                    : 'Number of winners drawn from entries.'}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Eligible Cities (comma-separated)</label>
                <input
                  type="text"
                  value={formData.eligible_cities}
                  onChange={(e) => setFormData({ ...formData, eligible_cities: e.target.value })}
                  placeholder="New York, Los Angeles, Chicago"
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="checkbox-container text-white">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
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

        {/* Campaigns List */}
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
                    campaign.is_active ? 'bg-[#ff3600] text-white' : 'bg-gray-700 text-gray-300'
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

        {/* Selected Campaign Details */}
        {selectedCampaign && (
          <div className="mt-8 bg-[#111] p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="heading text-xl text-white">
                {selectedCampaign.name} - Entries ({selectedCampaign.entries?.length || 0})
              </h2>
              <button onClick={() => setSelectedCampaign(null)} className="text-gray-400">
                Close
              </button>
            </div>

            {selectedCampaign.entries && selectedCampaign.entries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 text-sm border-b border-gray-700">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Phone</th>
                      <th className="py-2 pr-4">City</th>
                      <th className="py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCampaign.entries.map((entry) => (
                      <tr key={entry.id} className="text-white text-sm border-b border-gray-800">
                        <td className="py-2 pr-4">{entry.name}</td>
                        <td className="py-2 pr-4">{entry.email}</td>
                        <td className="py-2 pr-4">{entry.phone}</td>
                        <td className="py-2 pr-4">{entry.city}</td>
                        <td className="py-2">{new Date(entry.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">No entries yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
