import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatsCard from '../components/ui/StatsCard';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate, getStatusInfo } from '../utils/formatters';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentContracts, setRecentContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, contractsRes] = await Promise.all([
          api.get('/api/dashboard/stats'),
          api.get('/api/contracts', { params: { limit: 5 } }),
        ]);
        setStats(statsRes.data);
        setRecentContracts(contractsRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Chargement du dashboard..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex gap-sm">
          <Link to="/clients" className="btn btn--secondary">+ Nouveau client</Link>
          <Link to="/contracts/new" className="btn btn--primary">+ Nouveau contrat</Link>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <StatsCard icon="📄" value={stats?.total_contracts ?? 0} label="Total contrats" />
        <StatsCard icon="✏️" value={stats?.contracts_by_status?.draft ?? 0} label="Brouillons" color="var(--text-muted)" />
        <StatsCard icon="📨" value={stats?.contracts_by_status?.sent_for_signature ?? 0} label="En signature" color="var(--warning)" />
        <StatsCard icon="✅" value={stats?.contracts_by_status?.signed ?? 0} label="Signés" color="var(--success)" />
        <StatsCard icon="👥" value={stats?.total_clients ?? 0} label="Clients" color="var(--info)" />
      </div>

      {/* Recent contracts */}
      <div className="card">
        <div className="flex items-center justify-between mb-md">
          <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 700 }}>Contrats récents</h2>
          <Link to="/contracts" className="btn btn--ghost btn--sm">Voir tout →</Link>
        </div>

        {recentContracts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', textAlign: 'center', padding: 'var(--space-xl)' }}>
            Aucun contrat pour le moment
          </p>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentContracts.map((c) => {
                  const status = getStatusInfo(c.status);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/contracts/${c.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.reference}
                        </Link>
                      </td>
                      <td>{formatCurrency(c.amount)}</td>
                      <td><Badge variant={status.variant}>{status.label}</Badge></td>
                      <td>{formatDate(c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
