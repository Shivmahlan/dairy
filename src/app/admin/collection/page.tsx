'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { MemberOption, MilkCollectionWithMember } from '@/lib/types';
import { formatCurrency, formatDate, formatNumber, getLocalDateValue } from '@/lib/utils';

type CollectionFormState = {
  date: string;
  shift: 'Morning' | 'Evening';
  member_id: string;
  weight: string;
  fat_percentage: string;
  rate: string;
};

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

const defaultDate = getLocalDateValue();

export default function MilkCollectionPage() {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [collections, setCollections] = useState<MilkCollectionWithMember[]>([]);
  const [formData, setFormData] = useState<CollectionFormState>({
    date: defaultDate,
    shift: 'Morning',
    member_id: '',
    weight: '',
    fat_percentage: '',
    rate: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialData() {
      try {
        const [nextMembers, nextCollections] = await Promise.all([
          requestMemberOptions(),
          requestCollections(defaultDate),
        ]);

        if (!isCancelled) {
          setMembers(nextMembers);
          setCollections(nextCollections);
        }
      } catch (error) {
        if (!isCancelled) {
          setNotice({
            tone: 'error',
            message: getErrorMessage(error, 'Unable to load collection data.'),
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const dailyTotals = useMemo(() => {
    return collections.reduce(
      (totals, entry) => ({
        weight: totals.weight + entry.weight,
        amount: totals.amount + entry.total_amount,
        suppliers: totals.suppliers.add(entry.member_id),
      }),
      { weight: 0, amount: 0, suppliers: new Set<number>() },
    );
  }, [collections]);

  const calculatedTotal = (Number(formData.weight) || 0) * (Number(formData.rate) || 0);

  function handleInputChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;

    setFormData((current) => {
      const nextState = { ...current, [name]: value };

      if (name === 'fat_percentage' || name === 'weight') {
        const fat = Number(nextState.fat_percentage);
        nextState.rate = fat > 0 ? (fat * 8.3).toFixed(2) : '';
      }

      return nextState;
    });
  }

  async function handleDateChange(nextDate: string) {
    setFormData((current) => ({ ...current, date: nextDate }));
    setNotice(null);
    setIsLoading(true);

    try {
      setCollections(await requestCollections(nextDate));
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, 'Unable to load entries for that date.'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setIsSaving(true);

    try {
      const response = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save collection entry.');
      }

      setCollections(await requestCollections(formData.date));
      setFormData((current) => ({
        ...current,
        member_id: '',
        weight: '',
        fat_percentage: '',
        rate: '',
      }));
      setNotice({ tone: 'success', message: 'Collection entry saved.' });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, 'Unable to save collection entry.'),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Milk collection</p>
          <h1 className="page-title">Capture collection entries quickly</h1>
          <p className="page-description">
            Record each member&apos;s shift, fat percentage, and payout value with duplicate protection per date and
            shift.
          </p>
        </div>
      </section>

      {notice && <div className={`notice notice-${notice.tone}`}>{notice.message}</div>}

      <section className="stat-grid stat-grid-three">
        <article className="metric-card accent-blue">
          <p className="metric-label">Selected date</p>
          <h2 className="metric-value">{formatDate(formData.date)}</h2>
          <p className="metric-meta">Entries refresh instantly when the date changes</p>
        </article>
        <article className="metric-card accent-green">
          <p className="metric-label">Milk total</p>
          <h2 className="metric-value">{formatNumber(dailyTotals.weight)} kg</h2>
          <p className="metric-meta">{dailyTotals.suppliers.size} suppliers contributed</p>
        </article>
        <article className="metric-card accent-amber">
          <p className="metric-label">Payout total</p>
          <h2 className="metric-value">{formatCurrency(dailyTotals.amount)}</h2>
          <p className="metric-meta">Calculated from saved collection entries</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">New entry</p>
            <h2 className="panel-title">Add milk collection</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-grid form-grid-three">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={(event) => void handleDateChange(event.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shift</label>
              <select name="shift" value={formData.shift} onChange={handleInputChange} className="form-input" required>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Member</label>
              <select name="member_id" value={formData.member_id} onChange={handleInputChange} className="form-input" required>
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.member_code} - {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid form-grid-four">
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fat %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="fat_percentage"
                value={formData.fat_percentage}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rate (₹ / kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="rate"
                value={formData.rate}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total amount</label>
              <div className="summary-field">{formatCurrency(calculatedTotal || 0)}</div>
            </div>
          </div>

          <div className="panel-actions">
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving entry...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Entries</p>
            <h2 className="panel-title">Saved entries for {formatDate(formData.date)}</h2>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Shift</th>
                <th>Weight</th>
                <th>Fat %</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.member_code}</strong> - {entry.member_name}
                  </td>
                  <td>
                    <span className={`badge ${entry.shift === 'Morning' ? 'badge-success' : 'badge-info'}`}>
                      {entry.shift}
                    </span>
                  </td>
                  <td>{formatNumber(entry.weight)} kg</td>
                  <td>{formatNumber(entry.fat_percentage)}%</td>
                  <td>{formatCurrency(entry.rate)}</td>
                  <td className="text-success font-bold">{formatCurrency(entry.total_amount)}</td>
                </tr>
              ))}

              {!isLoading && collections.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No collection entries recorded for this date.
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td colSpan={6} className="table-empty">
                    Loading entries...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function requestMemberOptions() {
  const response = await fetch('/api/members');
  const payload = (await response.json()) as MemberOption[] | { error?: string };

  if (!response.ok) {
    throw new Error('error' in payload ? payload.error || 'Unable to fetch members.' : 'Unable to fetch members.');
  }

  return Array.isArray(payload)
    ? payload.map((member) => ({ id: member.id, member_code: member.member_code, name: member.name }))
    : [];
}

async function requestCollections(date: string) {
  const response = await fetch(`/api/collection?date=${date}`);
  const payload = (await response.json()) as MilkCollectionWithMember[] | { error?: string };

  if (!response.ok) {
    throw new Error(
      'error' in payload ? payload.error || 'Unable to fetch collection entries.' : 'Unable to fetch collection entries.',
    );
  }

  return Array.isArray(payload) ? payload : [];
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
