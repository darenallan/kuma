import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

export default function TemplatesListPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/templates', { params: { active_only: false } })
      .then(({ data }) => setTemplates(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Chargement des modèles…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Modèles de contrat</h1>
          <p className="page-subtitle">
            {templates.length} modèle{templates.length !== 1 ? 's' : ''} disponible{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon="template"
          title="Aucun modèle"
          text="Les modèles définissent la trame de vos contrats et permettent de générer les PDF automatiquement."
        />
      ) : (
        <div className="grid grid--cards">
          {templates.map((t, i) => (
            <article key={t.id} className="card animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between gap-sm mb-md">
                <span className="stat-card-icon stat-card-icon--accent" style={{ marginBottom: 0 }}>
                  <Icon name="template" size={18} />
                </span>
                <Badge variant={t.is_active ? 'success' : 'neutral'}>
                  {t.is_active ? 'Actif' : 'Inactif'}
                </Badge>
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
                <span>Version {t.version}</span>
                <span>{formatDate(t.created_at)}</span>
              </div>

              {t.is_active && (
                <Link to="/contracts/new" className="btn btn--secondary btn--sm w-full mt-md">
                  Créer un contrat
                  <Icon name="arrowRight" size={14} />
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
