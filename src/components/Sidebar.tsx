'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Members', href: '/admin/members' },
    { name: 'Milk Collection', href: '/admin/collection' },
    { name: 'Daily Summary', href: '/admin/summary' },
    { name: 'Financials', href: '/admin/financials' },
    { name: 'Reports', href: '/admin/reports' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 21h14" />
            <path d="M6 21v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
            <path d="M12 2A10 10 0 1 0 22 12" />
            <path d="M16 12a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <div>
          <div>Dairy Manager</div>
          <p className="sidebar-subtitle">Operations console</p>
        </div>
      </div>

      <nav className="nav-links">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-footer-label">Member access</p>
        <Link href="/member" className="nav-link nav-link-secondary">
          Open Member Portal
        </Link>
      </div>
    </aside>
  );
}
