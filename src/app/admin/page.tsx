import Link from 'next/link';
import { getAdminDashboardData } from '@/lib/dairy';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatSignedCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const data = getAdminDashboardData();

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1 className="page-title">Dairy operations at a glance</h1>
          <p className="page-description">
            Monitor today&apos;s collection, keep an eye on pending member requests, and follow the payout picture
            without jumping between screens.
          </p>
        </div>
        <div className="hero-chip">Live for {formatDate(data.date)}</div>
      </section>

      <section className="stat-grid stat-grid-four">
        <article className="metric-card accent-blue">
          <p className="metric-label">Milk collected today</p>
          <h2 className="metric-value">{formatNumber(data.stats.totalMilkToday)} kg</h2>
          <p className="metric-meta">{data.stats.activeSuppliersToday} active suppliers today</p>
        </article>

        <article className="metric-card accent-green">
          <p className="metric-label">Today&apos;s payout value</p>
          <h2 className="metric-value">{formatCurrency(data.stats.totalAmountToday)}</h2>
          <p className="metric-meta">Based on all collection entries for the day</p>
        </article>

        <article className="metric-card accent-amber">
          <p className="metric-label">Pending product requests</p>
          <h2 className="metric-value">{data.stats.pendingRequests}</h2>
          <p className="metric-meta">Needs review from the admin side</p>
        </article>

        <article className="metric-card accent-slate">
          <p className="metric-label">Registered members</p>
          <h2 className="metric-value">{data.stats.totalMembers}</h2>
          <p className="metric-meta">Active supplier base in the system</p>
        </article>
      </section>

      <section className="panel-grid panel-grid-main">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Month so far</p>
              <h2 className="panel-title">Collection momentum</h2>
            </div>
            <Link href="/admin/reports" className="inline-link">
              View full reports
            </Link>
          </div>

          <div className="split-metrics">
            <div>
              <p className="metric-label">Milk handled</p>
              <p className="split-metric-value">{formatNumber(data.stats.monthMilk)} kg</p>
            </div>
            <div>
              <p className="metric-label">Payout exposure</p>
              <p className="split-metric-value">{formatCurrency(data.stats.monthPayout)}</p>
            </div>
          </div>

          <div className="table-container compact-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Net balance</th>
                </tr>
              </thead>
              <tbody>
                {data.topBalances.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.member_code}</strong> - {member.name}
                    </td>
                    <td className={member.balance >= 0 ? 'text-success font-bold' : 'text-danger font-bold'}>
                      {formatSignedCurrency(member.balance)}
                    </td>
                  </tr>
                ))}
                {data.topBalances.length === 0 && (
                  <tr>
                    <td colSpan={2} className="table-empty">
                      No member balances yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Queue</p>
              <h2 className="panel-title">Pending member requests</h2>
            </div>
            <Link href="/admin/financials" className="inline-link">
              Manage requests
            </Link>
          </div>

          <div className="request-list">
            {data.pendingRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-card-head">
                  <div>
                    <strong>{request.member_code}</strong> - {request.member_name}
                  </div>
                  <span className="badge badge-warning">{request.status}</span>
                </div>
                <p className="request-card-title">{request.product_name}</p>
                <p className="request-card-meta">Requested {formatDateTime(request.requested_at)}</p>
              </div>
            ))}

            {data.pendingRequests.length === 0 && (
              <div className="empty-panel">
                <p>No pending requests right now.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Latest activity</p>
            <h2 className="panel-title">Recent collection entries</h2>
          </div>
          <Link href="/admin/collection" className="inline-link">
            Add new entry
          </Link>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Shift</th>
                <th>Weight</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentCollections.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date)}</td>
                  <td>
                    <strong>{entry.member_code}</strong> - {entry.member_name}
                  </td>
                  <td>
                    <span className={`badge ${entry.shift === 'Morning' ? 'badge-success' : 'badge-info'}`}>
                      {entry.shift}
                    </span>
                  </td>
                  <td>{formatNumber(entry.weight)} kg</td>
                  <td className="text-success font-bold">{formatCurrency(entry.total_amount)}</td>
                </tr>
              ))}
              {data.recentCollections.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No collection entries recorded yet.
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
