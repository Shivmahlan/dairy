import Link from 'next/link';

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-mark">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div>
            <div>Member Portal</div>
            <p className="sidebar-subtitle">Personal dashboard</p>
          </div>
        </div>

        <nav className="nav-links">
          <Link href="/member" className="nav-link active">
            My Dashboard
          </Link>
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-footer-label">Portal access</p>
          <p className="sidebar-helper-text">View earnings, deductions, and request updates.</p>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
