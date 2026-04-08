'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { MemberDashboardData } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, formatSignedCurrency } from '@/lib/utils';

export default function MemberDashboard() {
  const [memberCode, setMemberCode] = useState('');
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productRequest, setProductRequest] = useState('');
  const [requestStatus, setRequestStatus] = useState('');

  async function fetchDashboardData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberCode.trim()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/member-dashboard?code=${memberCode.trim()}`);
      const payload = (await response.json()) as MemberDashboardData | { error?: string };

      if (!response.ok) {
        throw new Error('error' in payload ? payload.error || 'Failed to authenticate.' : 'Failed to authenticate.');
      }

      setData(payload as MemberDashboardData);
    } catch (fetchError) {
      setData(null);
      setError(getErrorMessage(fetchError, 'Connection error.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleProductRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productRequest || !data) {
      return;
    }

    setRequestStatus('Submitting request...');

    try {
      const response = await fetch('/api/product-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: data.member.id,
          product_name: productRequest,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to submit request.');
      }

      const refreshedData = await fetchMemberDashboard(data.member.member_code);
      setData(refreshedData);
      setProductRequest('');
      setRequestStatus('Request sent. You can track its status below.');
    } catch (requestError) {
      setRequestStatus(getErrorMessage(requestError, 'Error sending request.'));
    }
  }

  if (!data) {
    return (
      <div className="centered-page">
        <div className="auth-card">
          <p className="eyebrow">Member portal</p>
          <h1 className="page-title">Access your dashboard</h1>
          <p className="page-description">Enter your member code to review milk earnings, deductions, and request updates.</p>

          <form onSubmit={fetchDashboardData} className="form-stack">
            <div className="form-group">
              <label className="form-label">Member code</label>
              <input
                type="text"
                value={memberCode}
                onChange={(event) => setMemberCode(event.target.value)}
                className="form-input auth-input"
                placeholder="e.g. 01 or 105"
                required
              />
            </div>

            {error && <div className="notice notice-error">{error}</div>}

            <button type="submit" className="btn btn-primary full-width" disabled={loading}>
              {loading ? 'Checking access...' : 'Open Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1 className="page-title">{data.member.name}</h1>
          <p className="page-description">
            Member code {data.member.member_code} • Joined {formatDate(data.member.joined_date)}
          </p>
        </div>
        <button onClick={() => setData(null)} className="btn btn-secondary">
          Logout
        </button>
      </section>

      <section className="stat-grid stat-grid-three">
        <article className="metric-card accent-green">
          <p className="metric-label">Total milk earnings</p>
          <h2 className="metric-value">{formatCurrency(data.totalCredit)}</h2>
          <p className="metric-meta">All saved milk collection entries</p>
        </article>

        <article className="metric-card accent-amber">
          <p className="metric-label">Total deductions</p>
          <h2 className="metric-value">{formatCurrency(data.totalDebit)}</h2>
          <p className="metric-meta">Products and advances debited so far</p>
        </article>

        <article className={`metric-card ${data.balance >= 0 ? 'accent-blue' : 'accent-red'}`}>
          <p className="metric-label">Current net balance</p>
          <h2 className="metric-value">{formatSignedCurrency(data.balance)}</h2>
          <p className="metric-meta">What remains after deductions</p>
        </article>
      </section>

      <section className="panel-grid panel-grid-main">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Milk history</p>
              <h2 className="panel-title">Recent deliveries</h2>
            </div>
          </div>

          <div className="table-container compact-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Weight</th>
                  <th>Fat %</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.milkEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.date)}</td>
                    <td>
                      <span className={`badge ${entry.shift === 'Morning' ? 'badge-success' : 'badge-info'}`}>{entry.shift}</span>
                    </td>
                    <td>{entry.weight} kg</td>
                    <td>{entry.fat_percentage}%</td>
                    <td className="text-success font-bold">{formatCurrency(entry.total_amount)}</td>
                  </tr>
                ))}

                {data.milkEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      No milk deliveries have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <div className="stack-panel">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Deductions</p>
                <h2 className="panel-title">Recent product entries</h2>
              </div>
            </div>

            <div className="table-container compact-table">
              <table className="table">
                <tbody>
                  {data.deductions.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date)}</td>
                      <td>{entry.product_name}</td>
                      <td className="text-danger font-bold">{formatCurrency(entry.amount)}</td>
                    </tr>
                  ))}

                  {data.deductions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="table-empty">
                        No deductions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel request-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Requests</p>
                <h2 className="panel-title">Request a product or advance</h2>
                <p className="panel-description">Requests are reviewed by the admin team before they are processed.</p>
              </div>
            </div>

            <form onSubmit={handleProductRequest} className="form-stack">
              <select value={productRequest} onChange={(event) => setProductRequest(event.target.value)} className="form-input" required>
                <option value="">Select request type</option>
                <option value="Khal">Khal</option>
                <option value="Churi">Churi</option>
                <option value="Ghee">Ghee</option>
                <option value="Cash Advance">Cash Advance</option>
              </select>
              <button type="submit" className="btn btn-primary">
                Send Request
              </button>
            </form>

            {requestStatus && <div className="notice notice-success">{requestStatus}</div>}

            <div className="request-list">
              {data.productRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-card-head">
                    <strong>{request.product_name}</strong>
                    <span
                      className={`badge ${
                        request.status === 'Pending'
                          ? 'badge-warning'
                          : request.status === 'Rejected'
                            ? 'badge-danger'
                            : 'badge-success'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p className="request-card-meta">Submitted {formatDateTime(request.requested_at)}</p>
                  {request.response_note && <p className="request-card-note">{request.response_note}</p>}
                </div>
              ))}

              {data.productRequests.length === 0 && <div className="empty-panel">No requests submitted yet.</div>}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

async function fetchMemberDashboard(memberCode: string) {
  const response = await fetch(`/api/member-dashboard?code=${memberCode}`);
  const payload = (await response.json()) as MemberDashboardData | { error?: string };

  if (!response.ok) {
    throw new Error('error' in payload ? payload.error || 'Unable to load dashboard.' : 'Unable to load dashboard.');
  }

  return payload as MemberDashboardData;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
