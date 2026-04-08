'use client';

import { useEffect, useState } from 'react';
import type { ReportData } from '@/lib/types';
import { formatCurrency, formatNumber, getLocalDateValue } from '@/lib/utils';

type Notice = {
  tone: 'error';
  message: string;
};

function getStartOfMonth() {
  const today = new Date();
  const localDate = new Date(today.getFullYear(), today.getMonth(), 1);
  return getLocalDateValue(localDate);
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(getStartOfMonth());
  const [toDate, setToDate] = useState(getLocalDateValue());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadReport() {
      try {
        const report = await requestReport(fromDate, toDate);

        if (!isCancelled) {
          setData(report);
          setNotice(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setData(null);
          setNotice({
            tone: 'error',
            message: getErrorMessage(error, 'Unable to generate report.'),
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      isCancelled = true;
    };
  }, [fromDate, toDate]);

  function handleFromDateChange(value: string) {
    setLoading(true);
    setFromDate(value);
  }

  function handleToDateChange(value: string) {
    setLoading(true);
    setToDate(value);
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Reports</p>
          <h1 className="page-title">Review period performance</h1>
          <p className="page-description">
            Compare milk handled, payout totals, deductions, and the members driving the strongest contribution over any
            date range.
          </p>
        </div>

        <div className="date-range-card">
          <div className="form-group">
            <label className="form-label">From</label>
            <input type="date" value={fromDate} onChange={(event) => handleFromDateChange(event.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input type="date" value={toDate} onChange={(event) => handleToDateChange(event.target.value)} className="form-input" />
          </div>
        </div>
      </section>

      {notice && <div className={`notice notice-${notice.tone}`}>{notice.message}</div>}

      {data && (
        <>
          <section className="stat-grid stat-grid-four">
            <article className="metric-card accent-blue">
              <p className="metric-label">Total milk purchased</p>
              <h2 className="metric-value">{formatNumber(data.total_milk_purchased)} kg</h2>
              <p className="metric-meta">{data.collection_days} collection day(s)</p>
            </article>

            <article className="metric-card accent-green">
              <p className="metric-label">Milk payments</p>
              <h2 className="metric-value">{formatCurrency(data.total_payments)}</h2>
              <p className="metric-meta">Total credit earned by members</p>
            </article>

            <article className="metric-card accent-amber">
              <p className="metric-label">Product deductions</p>
              <h2 className="metric-value">{formatCurrency(data.total_product_sales)}</h2>
              <p className="metric-meta">Total debits recorded in the period</p>
            </article>

            <article className="metric-card accent-slate">
              <p className="metric-label">Net balance to pay</p>
              <h2 className="metric-value">{formatCurrency(data.net_balance)}</h2>
              <p className="metric-meta">{formatNumber(data.average_daily_milk)} kg average per day</p>
            </article>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Top suppliers</p>
                <h2 className="panel-title">Highest contributors for the selected period</h2>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Milk</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_suppliers.map((supplier) => (
                    <tr key={supplier.member_id}>
                      <td>
                        <strong>{supplier.member_code}</strong> - {supplier.member_name}
                      </td>
                      <td>{formatNumber(supplier.total_weight)} kg</td>
                      <td className="text-success font-bold">{formatCurrency(supplier.total_amount)}</td>
                    </tr>
                  ))}

                  {data.top_suppliers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="table-empty">
                        No collection data is available for the selected range.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td colSpan={3} className="table-empty">
                        Generating report...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

async function requestReport(fromDate: string, toDate: string) {
  const response = await fetch(`/api/reports?from=${fromDate}&to=${toDate}`);
  const payload = (await response.json()) as ReportData | { error?: string };

  if (!response.ok) {
    throw new Error('error' in payload ? payload.error || 'Unable to fetch report.' : 'Unable to fetch report.');
  }

  return payload as ReportData;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
