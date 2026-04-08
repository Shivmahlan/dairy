'use client';

import { useEffect, useState } from 'react';
import type { SummaryData } from '@/lib/types';
import { formatCurrency, formatDate, formatNumber, getLocalDateValue } from '@/lib/utils';

type Notice = {
  tone: 'error';
  message: string;
};

const today = getLocalDateValue();

export default function DailySummaryPage() {
  const [date, setDate] = useState(today);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadSummary() {
      try {
        const summary = await requestSummary(date);

        if (!isCancelled) {
          setData(summary);
          setNotice(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setData(null);
          setNotice({
            tone: 'error',
            message: getErrorMessage(error, 'Unable to load summary data.'),
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isCancelled = true;
    };
  }, [date]);

  function handleDateChange(nextDate: string) {
    setLoading(true);
    setDate(nextDate);
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Daily summary</p>
          <h1 className="page-title">Understand each collection day quickly</h1>
          <p className="page-description">
            Review total milk, payout value, supplier count, and the split between morning and evening collection.
          </p>
        </div>
        <div className="date-filter-card">
          <label className="form-label">Summary date</label>
          <input type="date" value={date} onChange={(event) => handleDateChange(event.target.value)} className="form-input" />
        </div>
      </section>

      {notice && <div className={`notice notice-${notice.tone}`}>{notice.message}</div>}

      {data && (
        <section className="stat-grid stat-grid-three">
          <article className="metric-card accent-blue">
            <p className="metric-label">Milk collected</p>
            <h2 className="metric-value">{formatNumber(data.totals.weight)} kg</h2>
            <p className="metric-meta">For {formatDate(date)}</p>
          </article>

          <article className="metric-card accent-green">
            <p className="metric-label">Purchase value</p>
            <h2 className="metric-value">{formatCurrency(data.totals.amount)}</h2>
            <p className="metric-meta">Calculated from saved entries</p>
          </article>

          <article className="metric-card accent-amber">
            <p className="metric-label">Supplier count</p>
            <h2 className="metric-value">{data.totals.suppliers}</h2>
            <p className="metric-meta">Unique members who supplied milk that day</p>
          </article>
        </section>
      )}

      <section className="panel-grid panel-grid-main">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Shift split</p>
              <h2 className="panel-title">Morning vs evening</h2>
            </div>
          </div>

          <div className="stack-grid">
            {data?.shiftTotals.map((shift) => (
              <div key={shift.shift} className="compact-stat-card">
                <div className="compact-stat-header">
                  <span className={`badge ${shift.shift === 'Morning' ? 'badge-success' : 'badge-info'}`}>{shift.shift}</span>
                  <span className="metric-meta">{shift.entries} entries</span>
                </div>
                <p className="compact-stat-value">{formatNumber(shift.total_weight)} kg</p>
                <p className="metric-meta">{formatCurrency(shift.total_amount)}</p>
              </div>
            ))}

            {!loading && data && data.shiftTotals.length === 0 && (
              <div className="empty-panel">No collection entries found for this date.</div>
            )}

            {loading && <div className="empty-panel">Loading summary...</div>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Suppliers</p>
              <h2 className="panel-title">Top contributions for the day</h2>
            </div>
          </div>

          <div className="table-container compact-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Milk</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data?.members.map((member) => (
                  <tr key={member.member_id}>
                    <td>
                      <strong>{member.member_code}</strong> - {member.member_name}
                    </td>
                    <td>{formatNumber(member.total_weight)} kg</td>
                    <td className="text-success font-bold">{formatCurrency(member.total_amount)}</td>
                  </tr>
                ))}

                {!loading && data && data.members.length === 0 && (
                  <tr>
                    <td colSpan={3} className="table-empty">
                      No suppliers recorded for this date.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={3} className="table-empty">
                      Loading summary...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}

async function requestSummary(date: string) {
  const response = await fetch(`/api/summary?date=${date}`);
  const payload = (await response.json()) as SummaryData | { error?: string };

  if (!response.ok) {
    throw new Error('error' in payload ? payload.error || 'Unable to fetch summary.' : 'Unable to fetch summary.');
  }

  return payload as SummaryData;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
