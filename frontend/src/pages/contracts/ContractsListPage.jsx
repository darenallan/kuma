import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatDate, getStatusInfo } from '../../utils/formatters';

export default function ContractsListPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchContracts = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/api/contracts', { params });
      setContracts(data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchContracts(); }, [statusFilter]);

  if (loading) return <LoadingSpinner size="lg" text="Chargement des contrats..." />;

  const statuses = ['', 'draft', 'generated', 'sent_for_signature', 'signed', 'archived', 'cancelled'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contrats</h1>
          <p className="page-subtitle">{contracts.length} contrat{contracts.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/contracts/new" className="btn btn--primary">+ Nouveau contrat</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-sm mb-lg" style={{ flexWrap: 'wrap' }}>
        {statuses.map((s) => {
          const info = s ? getStatusInfo(s) : { label: 'Tous', variant: 'neutral' };
          return (
            <button
              key={s}
              className={`btn btn--sm ${statusFilter === s ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {info.label}
            </button>
          );
        })}
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          icon="📄"
          title="Aucun contrat"
          text="Créez votre premier contrat en sélectionnant un template et un client."
          action={<Link to="/contracts/new" className="btn btn--primary">+ Nouveau contrat</Link>}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
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
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/contracts/${c.id}`} className="btn btn--ghost btn--sm">Voir →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
