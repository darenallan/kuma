import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Icon from '../components/ui/Icon';
import './DashboardLayout.css';

const NAV_ITEMS = [
  { to: '/', icon: 'dashboard', label: 'Tableau de bord' },
  { to: '/clients', icon: 'users', label: 'Clients' },
  { to: '/contracts', icon: 'contract', label: 'Contrats' },
  { to: '/templates', icon: 'template', label: 'Modèles' },
];

const ROLE_LABELS = { admin: 'Administrateur', manager: 'Gestionnaire', user: 'Utilisateur' };

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Referme le menu mobile à chaque navigation : sinon il masque la page ouverte.
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onEscape = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [sidebarOpen]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="layout">
      <a href="#main-content" className="skip-link">Aller au contenu</a>

      {sidebarOpen && (
        <div className="layout-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <span className="brand">
            <span className="brand-mark"><Icon name="bolt" size={18} strokeWidth={2} /></span>
            <span className="brand-text">Kuma</span>
          </span>
          <button
            className="btn btn--ghost btn--icon btn--sm sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer le menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar">{user?.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
            <span className="sidebar-user-info">
              <span className="sidebar-user-name truncate">{user?.full_name || 'Utilisateur'}</span>
              <span className="sidebar-user-role">{ROLE_LABELS[user?.role] || user?.role}</span>
            </span>
          </div>
          <button
            className="btn btn--ghost btn--icon btn--sm"
            onClick={handleLogout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="main-header">
          <button
            className="btn btn--ghost btn--icon hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={sidebarOpen}
          >
            <Icon name="menu" size={20} />
          </button>

          <span className="header-date">{today}</span>

          <button
            className="btn btn--ghost btn--icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
            title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </header>

        <main className="main-content animate-fade" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
