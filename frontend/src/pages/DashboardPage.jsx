import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatsCard from '../components/ui/StatsCard';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Icon from '../components/ui/Icon';
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

  if (loading) return <LoadingSpinner size="lg" text="Chargement du tableau de bord…" />;

  const byStatus = stats?.contracts_by_status || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue d'ensemble de votre activité contractuelle</p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <Link to="/clients" className="btn btn--secondary">
            <Icon name="users" size={16} />
            Nouveau client
          </Link>
          <Link to="/contracts/new" className="btn btn--primary">
            <Icon name="plus" size={16} />
            Nouveau contrat
          </Link>
        </div>
      </div>

      <div className="grid grid--stats mb-lg">
        <StatsCard icon="contract" value={stats?.total_contracts ?? 0} label="Contrats au total" tone="accent" delay={0} />
        <StatsCard icon="pencil" value={byStatus.draft ?? 0} label="Brouillons" tone="neutral" delay={50} />
        <StatsCard icon="send" value={byStatus.sent_for_signature ?? 0} label="En attente de signature" tone="warning" delay={100} />
        <StatsCard icon="checkCircle" value={byStatus.signed ?? 0} label="Signés" tone="success" delay={150} />
        <StatsCard icon="users" value={stats?.total_clients ?? 0} label="Clients" tone="accent" delay={200} />
      </div>

      <section className="card card--flush">
        <div className="card-header" style={{ padding: 'var(--space-md) var(--space-lg)', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h2 className="card-title">Contrats récents</h2>
          <Link to="/contracts" className="btn btn--ghost btn--sm">
            Voir tout
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>

        {recentContracts.length === 0 ? (
          <EmptyState
            icon="contract"
            title="Aucun contrat pour le moment"
            text="Créez votre premier contrat à partir d'un modèle et d'un client."
            action={<Link to="/contracts/new" className="btn btn--primary"><Icon name="plus" size={16} />Nouveau contrat</Link>}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {recentContracts.map((c) => {
                  const status = getStatusInfo(c.status);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/contracts/${c.id}`} className="table-cell-strong">{c.reference}</Link>
                      </td>
                      <td className="table-num">{formatCurrency(c.amount)}</td>
                      <td><Badge variant={status.variant}>{status.label}</Badge></td>
                      <td>{formatDate(c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
