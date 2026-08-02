import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import './ContractCreatePage.css';

const STEPS = ['Template', 'Client', 'Variables', 'Récapitulatif'];

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    template_id: null,
    client_id: null,
    amount: '',
    duration_months: '',
    variables: {
      prestataire_nom: '',
      prestation: '',
      clauses_specifiques: '',
    },
  });

  useEffect(() => {
    Promise.all([
      api.get('/api/templates'),
      api.get('/api/clients'),
    ]).then(([tRes, cRes]) => {
      setTemplates(tRes.data);
      setClients(cRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === form.template_id);
  const selectedClient = clients.find((c) => c.id === form.client_id);

  const canNext = () => {
    if (step === 0) return !!form.template_id;
    if (step === 1) return !!form.client_id;
    if (step === 2) return !!form.amount && Number(form.amount) > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        template_id: form.template_id,
        client_id: form.client_id,
        amount: Number(form.amount),
        duration_months: form.duration_months ? Number(form.duration_months) : null,
        variables: form.variables,
      };
      const { data } = await api.post('/api/contracts', payload);
      addToast('Contrat créé avec succès !', 'success');
      navigate(`/contracts/${data.id}`);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Erreur lors de la création', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Chargement..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nouveau contrat</h1>
          <p className="page-subtitle">Étape {step + 1} / {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-lg">
        <div className="progress-bar-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {/* Step content */}
      <div className="wizard-step animate-fade">
        {step === 0 && (
          <div>
            <h2 className="wizard-step-title">Choisissez un template</h2>
            <div className="wizard-grid">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={`card card--interactive wizard-option ${form.template_id === t.id ? 'wizard-option--selected' : ''}`}
                  onClick={() => setForm({ ...form, template_id: t.id })}
                >
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>📋</div>
                  <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>{t.name}</h3>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{t.description || 'Aucune description'}</p>
                </div>
              ))}
            </div>
            {templates.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                Aucun template disponible. Créez-en un d'abord.
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="wizard-step-title">Sélectionnez le client</h2>
            <div className="wizard-grid">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className={`card card--interactive wizard-option ${form.client_id === c.id ? 'wizard-option--selected' : ''}`}
                  onClick={() => setForm({ ...form, client_id: c.id })}
                >
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🏢</div>
                  <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>{c.company_name}</h3>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{c.contact_name} — {c.email}</p>
                </div>
              ))}
            </div>
            {clients.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                Aucun client. <a href="/clients">Ajoutez un client</a> d'abord.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ maxWidth: 520 }}>
            <h2 className="wizard-step-title">Détails de la prestation</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Nom du prestataire</label>
                <input className="input" value={form.variables.prestataire_nom}
                  onChange={(e) => setForm({ ...form, variables: { ...form.variables, prestataire_nom: e.target.value } })}
                  placeholder="Votre nom ou raison sociale"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description de la prestation</label>
                <textarea className="textarea" value={form.variables.prestation}
                  onChange={(e) => setForm({ ...form, variables: { ...form.variables, prestation: e.target.value } })}
                  placeholder="Montage vidéo, étalonnage, sous-titrage FR/EN..."
                  rows={3}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Montant (FCFA) *</label>
                  <input className="input" type="number" min="1" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="150000"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Durée (mois)</label>
                  <input className="input" type="number" min="1" value={form.duration_months}
                    onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
                    placeholder="3"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Clauses spécifiques</label>
                <textarea className="textarea" value={form.variables.clauses_specifiques}
                  onChange={(e) => setForm({ ...form, variables: { ...form.variables, clauses_specifiques: e.target.value } })}
                  placeholder="Clauses additionnelles (optionnel)..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ maxWidth: 560 }}>
            <h2 className="wizard-step-title">Récapitulatif</h2>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="recap-row"><span className="recap-label">Template</span><span className="recap-value">{selectedTemplate?.name}</span></div>
              <div className="recap-row"><span className="recap-label">Client</span><span className="recap-value">{selectedClient?.company_name}</span></div>
              <div className="recap-row"><span className="recap-label">Contact</span><span className="recap-value">{selectedClient?.contact_name} ({selectedClient?.email})</span></div>
              <div className="recap-row"><span className="recap-label">Prestataire</span><span className="recap-value">{form.variables.prestataire_nom || '—'}</span></div>
              <div className="recap-row"><span className="recap-label">Prestation</span><span className="recap-value">{form.variables.prestation || '—'}</span></div>
              <div className="recap-row"><span className="recap-label">Montant</span><span className="recap-value" style={{ fontWeight: 700, color: 'var(--accent)' }}>{Number(form.amount).toLocaleString('fr-FR')} FCFA</span></div>
              {form.duration_months && <div className="recap-row"><span className="recap-label">Durée</span><span className="recap-value">{form.duration_months} mois</span></div>}
              {form.variables.clauses_specifiques && <div className="recap-row"><span className="recap-label">Clauses</span><span className="recap-value">{form.variables.clauses_specifiques}</span></div>}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="wizard-nav">
        <button className="btn btn--secondary" onClick={() => step === 0 ? navigate('/contracts') : setStep(step - 1)}>
          {step === 0 ? 'Annuler' : '← Précédent'}
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn--primary" onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Suivant →
          </button>
        ) : (
          <button className="btn btn--primary btn--lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <span className="spinner" /> : '✓ Créer le contrat'}
          </button>
        )}
      </div>
    </div>
  );
}
