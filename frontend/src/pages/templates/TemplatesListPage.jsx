import { useEffect, useState } from 'react';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
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

  if (loading) return <LoadingSpinner size="lg" text="Chargement des templates..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''} disponible{templates.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Aucun template"
          text="Les templates de contrat permettent de générer des documents PDF automatiquement."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
          {templates.map((t) => (
            <div key={t.id} className="card card--interactive">
              <div className="flex items-center justify-between mb-md">
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700 }}>{t.name}</h3>
                <Badge variant={t.is_active ? 'success' : 'neutral'}>{t.is_active ? 'Actif' : 'Inactif'}</Badge>
              </div>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                {t.description || 'Aucune description'}
              </p>
              <div className="flex items-center justify-between" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                <span>v{t.version}</span>
                <span>{formatDate(t.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
