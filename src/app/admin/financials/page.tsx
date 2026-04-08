'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { FinancialData, ProductRequestStatus } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, formatSignedCurrency, getLocalDateValue } from '@/lib/utils';

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

type DebitFormState = {
  date: string;
  member_id: string;
  product_name: string;
  amount: string;
};

const createDefaultForm = (): DebitFormState => ({
  date: getLocalDateValue(),
  member_id: '',
  product_name: '',
  amount: '',
});

export default function FinancialsPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [formData, setFormData] = useState<DebitFormState>(createDefaultForm);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [balanceSearch, setBalanceSearch] = useState('');
  const deferredSearch = useDeferredValue(balanceSearch);

  useEffect(() => {
    let isCancelled = false;

    async function loadFinancials() {
      try {
        const financialData = await requestFinancials();

        if (!isCancelled) {
          setData(financialData);
        }
      } catch (error) {
        if (!isCancelled) {
          setNotice({
            tone: 'error',
            message: getErrorMessage(error, 'Unable to load financial data.'),
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFinancials();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredBalances = useMemo(() => {
    if (!data) {
      return [];
    }

    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return data.balances;
    }

    return data.balances.filter((member) =>
      `${member.member_code} ${member.name}`.toLowerCase().includes(query),
    );
  }, [data, deferredSearch]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch('/api/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to add deduction.');
      }

      setData(await requestFinancials());
      setFormData((current) => ({ ...current, product_name: '', amount: '', member_id: '' }));
      setNotice({ tone: 'success', message: 'Product deduction added.' });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, 'Unable to add deduction.'),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRequestStatus(requestId: number, status: ProductRequestStatus) {
    const noteInput =
      status === 'Pending'
        ? ''
        : window.prompt('Optional note for the member. Leave blank if not needed.', '') ?? undefined;

    if (noteInput === undefined && status !== 'Pending') {
      return;
    }

    setActiveRequestId(requestId);
    setNotice(null);

    try {
      const response = await fetch('/api/product-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          status,
          response_note: noteInput,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to update request.');
      }

      setData(await requestFinancials());
      setNotice({ tone: 'success', message: `Request marked as ${status.toLowerCase()}.` });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, 'Unable to update request.'),
      });
    } finally {
      setActiveRequestId(null);
    }
  }

  if (!data && isLoading) {
    return <div className="page-shell">Loading financials...</div>;
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Financials</p>
          <h1 className="page-title">Track deductions and request handling</h1>
          <p className="page-description">
            Keep every member&apos;s milk earnings, product deductions, and request approvals in one place.
          </p>
        </div>
      </section>

      {notice && <div className={`notice notice-${notice.tone}`}>{notice.message}</div>}

      <section className="panel-grid panel-grid-main">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New deduction</p>
              <h2 className="panel-title">Add product deduction</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Member</label>
              <select name="member_id" value={formData.member_id} onChange={handleInputChange} className="form-input" required>
                <option value="">Select member</option>
                {data?.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.member_code} - {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Product</label>
              <select name="product_name" value={formData.product_name} onChange={handleInputChange} className="form-input" required>
                <option value="">Select product</option>
                <option value="Khal">Khal</option>
                <option value="Churi">Churi</option>
                <option value="Ghee">Ghee</option>
                <option value="Cash Advance">Cash Advance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <button type="submit" className="btn btn-danger" disabled={isSaving}>
              {isSaving ? 'Saving deduction...' : 'Add Deduction'}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Request queue</p>
              <h2 className="panel-title">Member product requests</h2>
              <p className="panel-description">Approve, reject, or mark requests fulfilled after the deduction is handled.</p>
            </div>
          </div>

          <div className="request-list">
            {data?.productRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-card-head">
                  <div>
                    <strong>{request.member_code}</strong> - {request.member_name}
                  </div>
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
                <p className="request-card-title">{request.product_name}</p>
                <p className="request-card-meta">Requested {formatDateTime(request.requested_at)}</p>
                {request.response_note && <p className="request-card-note">{request.response_note}</p>}

                <div className="request-actions">
                  <button
                    onClick={() => void updateRequestStatus(request.id, 'Approved')}
                    className="btn btn-secondary btn-small"
                    disabled={activeRequestId === request.id}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => void updateRequestStatus(request.id, 'Fulfilled')}
                    className="btn btn-primary btn-small"
                    disabled={activeRequestId === request.id}
                  >
                    Fulfilled
                  </button>
                  <button
                    onClick={() => void updateRequestStatus(request.id, 'Rejected')}
                    className="btn btn-danger btn-small"
                    disabled={activeRequestId === request.id}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {!isLoading && data && data.productRequests.length === 0 && (
              <div className="empty-panel">No product requests have been submitted yet.</div>
            )}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Balances</p>
            <h2 className="panel-title">Member balances</h2>
          </div>
        </div>

        <div className="toolbar">
          <input
            type="text"
            className="form-input"
            placeholder="Search member balance..."
            value={balanceSearch}
            onChange={(event) => setBalanceSearch(event.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Earned</th>
                <th>Deducted</th>
                <th>Net balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.member_code}</strong> - {member.name}
                  </td>
                  <td className="text-success font-bold">{formatCurrency(member.total_credit)}</td>
                  <td className="text-danger font-bold">{formatCurrency(member.total_debit)}</td>
                  <td className={member.balance >= 0 ? 'text-success font-bold' : 'text-danger font-bold'}>
                    {formatSignedCurrency(member.balance)}
                  </td>
                </tr>
              ))}
              {data && filteredBalances.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-empty">
                    No members matched that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Recent deductions</p>
            <h2 className="panel-title">Latest product debit entries</h2>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Product</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentDebits.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date)}</td>
                  <td>
                    <strong>{entry.member_code}</strong> - {entry.member_name}
                  </td>
                  <td>{entry.product_name}</td>
                  <td className="text-danger font-bold">{formatCurrency(entry.amount)}</td>
                </tr>
              ))}
              {!isLoading && data && data.recentDebits.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-empty">
                    No deductions have been recorded yet.
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

async function requestFinancials() {
  const response = await fetch('/api/financials');
  const payload = (await response.json()) as FinancialData | { error?: string };

  if (!response.ok) {
    throw new Error('error' in payload ? payload.error || 'Unable to fetch financials.' : 'Unable to fetch financials.');
  }

  return payload as FinancialData;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
