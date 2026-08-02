import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DashboardLayout.css';

const NAV_ITEMS = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/clients', icon: '👥', label: 'Clients' },
  { to: '/contracts', icon: '📄', label: 'Contrats' },
  { to: '/templates', icon: '📋', label: 'Templates' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="layout-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">⚡</span>
            <span className="sidebar-logo-text">Kuma</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name truncate">{user?.full_name || 'Utilisateur'}</div>
              <div className="sidebar-user-role">{user?.role || 'user'}</div>
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={handleLogout} title="Déconnexion">
            🚪
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main">
        <header className="main-header">
          <button className="btn btn--ghost btn--icon hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
            ☰
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </header>
        <div className="main-content animate-fade">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
