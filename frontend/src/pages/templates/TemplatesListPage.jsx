import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/formatters';

export default function TemplatesListPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [deactivating, setDeactivating] = useState(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Rédiger un modèle engage tous les contrats produits ensuite.
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const fetchTemplates = async (includeInactive = showInactive) => {
    try {
      const { data } = await api.get('/api/templates', {
        params: { active_only: !includeInactive },
      });
      setTemplates(data);
    } catch {
      addToast('Impossible de charger les modèles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(showInactive); }, [showInactive]);

  const handleDuplicate = async (template) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/templates/${template.id}/duplicate`);
      addToast('Modèle dupliqué', 'success');
      navigate(`/templates/${data.id}/edit`);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Duplication impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDeactivate = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/templates/${deactivating.id}`);
      addToast('Modèle désactivé', 'success');
      setDeactivating(null);
      fetchTemplates();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Opération impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Chargement des modèles…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Modèles de contrat</h1>
          <p className="page-subtitle">
            {templates.length} modèle{templates.length !== 1 ? 's' : ''}
            {!showInactive && ' actif'}{!showInactive && templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <Link to="/templates/new" className="btn btn--primary">
            <Icon name="plus" size={16} />
            Nouveau modèle
          </Link>
        )}
      </div>

      <div className="filter-bar mb-lg" role="group" aria-label="Filtrer les modèles">
        <button
          type="button"
          className={`filter-chip ${!showInactive ? 'filter-chip--active' : ''}`}
          onClick={() => setShowInactive(false)}
          aria-pressed={!showInactive}
        >
          Actifs
        </button>
        <button
          type="button"
          className={`filter-chip ${showInactive ? 'filter-chip--active' : ''}`}
          onClick={() => setShowInactive(true)}
          aria-pressed={showInactive}
        >
          Tous
        </button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon="template"
          title="Aucun modèle"
          text="Un modèle définit la trame de vos contrats : ses articles et les informations à saisir à chaque fois."
          action={
            canEdit ? (
              <Link to="/templates/new" className="btn btn--primary">
                <Icon name="plus" size={16} />
                Créer un modèle
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid grid--cards">
          {templates.map((t, i) => {
            const articleCount = t.body?.articles?.length || 0;
            const variableCount = t.variables_schema?.length || 0;

            return (
              <article key={t.id} className="card animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center justify-between gap-sm mb-md">
                  <span className="stat-card-icon stat-card-icon--accent" style={{ marginBottom: 0 }}>
                    <Icon name={t.is_builtin ? 'lock' : 'template'} size={18} />
                  </span>
                  <div className="flex gap-xs items-center">
                    {t.is_builtin && <Badge variant="neutral">Intégré</Badge>}
                    <Badge variant={t.is_active ? 'success' : 'neutral'}>
                      {t.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>

                <h2 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: '0.25rem' }}>{t.name}</h2>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.55, minHeight: '2.7em' }}>
                  {t.description || 'Aucune description'}
                </p>

                <div
                  className="flex items-center justify-between mt-md"
                  style={{
                    paddingTop: 'var(--space-md)',
                    borderTop: '1px solid var(--border)',
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>
                    {t.is_builtin
                      ? 'Fourni avec l’application'
                      : `${articleCount} article${articleCount !== 1 ? 's' : ''} · ${variableCount} variable${variableCount !== 1 ? 's' : ''}`}
                  </span>
                  <span>v{t.version} · {formatDate(t.created_at)}</span>
                </div>

                {canEdit && (
                  <div className="flex gap-xs mt-md">
                    {!t.is_builtin && (
                      <Link to={`/templates/${t.id}/edit`} className="btn btn--secondary btn--sm" style={{ flex: 1 }}>
                        <Icon name="pencil" size={14} />
                        Modifier
                      </Link>
                    )}
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => handleDuplicate(t)}
                      disabled={busy}
                      title="Dupliquer ce modèle"
                      style={t.is_builtin ? { flex: 1 } : undefined}
                    >
                      <Icon name="copy" size={14} />
                      Dupliquer
                    </button>
                    {!t.is_builtin && t.is_active && (
                      <button
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={() => setDeactivating(t)}
                        aria-label={`Désactiver ${t.name}`}
                        title="Désactiver"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!deactivating}
        onClose={() => setDeactivating(null)}
        title="Désactiver ce modèle ?"
        width="440px"
      >
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong>{deactivating?.name}</strong> ne sera plus proposé à la création de contrat.
          Les contrats déjà établis avec ce modèle restent intacts et consultables.
        </p>
        <div className="flex gap-sm justify-end mt-lg">
          <button className="btn btn--secondary" onClick={() => setDeactivating(null)}>Annuler</button>
          <button className="btn btn--danger" onClick={confirmDeactivate} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Désactiver'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
