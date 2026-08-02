import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatDate, getStatusInfo } from '../../utils/formatters';

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'generated', label: 'PDF généré' },
  { value: 'sent_for_signature', label: 'En signature' },
  { value: 'signed', label: 'Signés' },
  { value: 'archived', label: 'Archivés' },
  { value: 'cancelled', label: 'Annulés' },
];

export default function ContractsListPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchContracts = async () => {
      try {
        const params = statusFilter ? { status: statusFilter } : {};
        const { data } = await api.get('/api/contracts', { params });
        if (!cancelled) setContracts(data);
      } catch {
        if (!cancelled) setContracts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContracts();
    // Annule l'application d'une réponse obsolète si le filtre change entre-temps.
    return () => { cancelled = true; };
  }, [statusFilter]);

  const activeFilter = FILTERS.find((f) => f.value === statusFilter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contrats</h1>
          <p className="page-subtitle">
            {loading ? 'Chargement…' : `${contracts.length} contrat${contracts.length !== 1 ? 's' : ''}`}
            {statusFilter && ` · ${activeFilter?.label}`}
          </p>
        </div>
        <Link to="/contracts/new" className="btn btn--primary">
          <Icon name="plus" size={16} />
          Nouveau contrat
        </Link>
      </div>

      <div className="filter-bar mb-lg" role="group" aria-label="Filtrer par statut">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`filter-chip ${statusFilter === f.value ? 'filter-chip--active' : ''}`}
            onClick={() => setStatusFilter(f.value)}
            aria-pressed={statusFilter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Chargement des contrats…" />
      ) : contracts.length === 0 ? (
        <EmptyState
          icon="contract"
          title={statusFilter ? 'Aucun contrat dans ce statut' : 'Aucun contrat'}
          text={
            statusFilter
              ? 'Essayez un autre filtre pour voir vos contrats.'
              : 'Créez votre premier contrat en sélectionnant un modèle et un client.'
          }
          action={
            statusFilter ? (
              <button className="btn btn--secondary" onClick={() => setStatusFilter('')}>
                Voir tous les contrats
              </button>
            ) : (
              <Link to="/contracts/new" className="btn btn--primary">
                <Icon name="plus" size={16} />
                Nouveau contrat
              </Link>
            )
          }
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
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const status = getStatusInfo(c.status);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/contracts/${c.id}`} className="table-cell-strong">{c.reference}</Link>
                    </td>
                    <td className="table-num">{formatCurrency(c.amount)}</td>
                    <td><Badge variant={status.variant}>{status.label}</Badge></td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      <div className="flex justify-end">
                        <Link to={`/contracts/${c.id}`} className="btn btn--ghost btn--sm">
                          Ouvrir
                          <Icon name="arrowRight" size={14} />
                        </Link>
                      </div>
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
