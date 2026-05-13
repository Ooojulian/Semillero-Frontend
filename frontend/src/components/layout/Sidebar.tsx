'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '../../types';

interface Props {
  user: User | null;
  onLogout: () => void;
}

const NAV = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      )},
      { href: '/candidates', label: 'Candidatos', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )},
      { href: '/chat', label: 'Chat', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      )},
    ],
  },
];

export const Sidebar = ({ user, onLogout }: Props) => {
  const path = usePathname();

  const initials = user
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">S</div>
        <span className="sidebar-logo-text">Semillero</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((section) => (
          <div key={section.section}>
            <p className="nav-section-label">{section.section}</p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${path.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <p className="user-name">{user?.full_name ?? 'Usuario'}</p>
          <p className="user-role">{user?.role ?? ''}</p>
        </div>
        <button onClick={onLogout} title="Cerrar sesión" style={{ color: 'var(--text-3)', fontSize: 18 }}>
          ⎋
        </button>
      </div>
    </aside>
  );
};
