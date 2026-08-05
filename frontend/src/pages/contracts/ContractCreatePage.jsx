import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import './ContractCreatePage.css';

const STEPS = ['Modèle', 'Client', 'Détails', 'Récapitulatif'];

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
    variables: {},
  });

  useEffect(() => {
    Promise.all([api.get('/api/templates'), api.get('/api/clients')])
      .then(([tRes, cRes]) => { setTemplates(tRes.data); setClients(cRes.data); })
      .catch(() => addToast('Impossible de charger les données', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const selectedTemplate = templates.find((t) => t.id === form.template_id);
  const selectedClient = clients.find((c) => c.id === form.client_id);

  // Les champs à saisir viennent du modèle choisi : un modèle personnalisé
  // déclare ses propres variables, il ne peut pas y avoir de liste figée ici.
  const templateVariables = selectedTemplate?.variables_schema || [];

  const setVariable = (key, value) =>
    setForm((f) => ({ ...f, variables: { ...f.variables, [key]: value } }));

  const canNext = () => {
    if (step === 0) return !!form.template_id;
    if (step === 1) return !!form.client_id;
    if (step === 2) {
      const amountOk = !!form.amount && Number(form.amount) > 0;
      const requiredOk = templateVariables
        .filter((v) => v.required)
        .every((v) => String(form.variables[v.key] || '').trim());
      return amountOk && requiredOk;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/contracts', {
        template_id: form.template_id,
        client_id: form.client_id,
        amount: Number(form.amount),
        duration_months: form.duration_months ? Number(form.duration_months) : null,
        variables: form.variables,
      });
      addToast('Contrat créé', 'success');
      navigate(`/contracts/${data.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      addToast(typeof detail === 'string' ? detail : 'Création impossible', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Chargement…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nouveau contrat</h1>
          <p className="page-subtitle">Étape {step + 1} sur {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      {/* Fil d'étapes : indique où l'on en est et ce qui reste à faire */}
      <ol className="stepper mb-lg">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`stepper-item ${i < step ? 'stepper-item--done' : ''} ${i === step ? 'stepper-item--current' : ''}`}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="stepper-dot">
              {i < step ? <Icon name="check" size={13} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className="stepper-label">{label}</span>
          </li>
        ))}
      </ol>

      <div className="wizard-step animate-fade" key={step}>
        {step === 0 && (
          <section>
            <h2 className="wizard-step-title">Choisissez un modèle</h2>
            {templates.length === 0 ? (
              <EmptyState
                icon="template"
                title="Aucun modèle disponible"
                text="Un modèle actif est nécessaire pour générer un contrat."
                action={<Link to="/templates" className="btn btn--secondary">Voir les modèles</Link>}
              />
            ) : (
              <div className="wizard-grid">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`wizard-option ${form.template_id === t.id ? 'wizard-option--selected' : ''}`}
                    onClick={() =>
                      // Changer de modèle change les champs à saisir : on repart d'un état vierge
                      // plutôt que de conserver des valeurs qui n'ont plus de destination.
                      setForm((f) => ({
                        ...f,
                        template_id: t.id,
                        variables: f.template_id === t.id ? f.variables : {},
                      }))
                    }
                    aria-pressed={form.template_id === t.id}
                  >
                    <span className="wizard-option-icon"><Icon name="template" size={18} /></span>
                    <span className="wizard-option-name">{t.name}</span>
                    <span className="wizard-option-meta">{t.description || 'Aucune description'}</span>
                    {form.template_id === t.id && (
                      <span className="wizard-option-check"><Icon name="check" size={13} strokeWidth={3} /></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 className="wizard-step-title">Sélectionnez le client</h2>
            {clients.length === 0 ? (
              <EmptyState
                icon="users"
                title="Aucun client"
                text="Ajoutez d'abord un client pour pouvoir établir un contrat à son nom."
                action={<Link to="/clients" className="btn btn--primary">Ajouter un client</Link>}
              />
            ) : (
              <div className="wizard-grid">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`wizard-option ${form.client_id === c.id ? 'wizard-option--selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, client_id: c.id }))}
                    aria-pressed={form.client_id === c.id}
                  >
                    <span className="wizard-option-icon"><Icon name="building" size={18} /></span>
                    <span className="wizard-option-name">{c.company_name}</span>
                    <span className="wizard-option-meta">{c.contact_name} · {c.email}</span>
                    {form.client_id === c.id && (
                      <span className="wizard-option-check"><Icon name="check" size={13} strokeWidth={3} /></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="wizard-form">
            <h2 className="wizard-step-title">Détails de la prestation</h2>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="amount">
                  Montant (FCFA)<span className="form-required">*</span>
                </label>
                <input
                  id="amount"
                  className="input"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="150000"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="duration">Durée (mois)</label>
                <input
                  id="duration"
                  className="input"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={form.duration_months}
                  onChange={(e) => setForm((f) => ({ ...f, duration_months: e.target.value }))}
                  placeholder="3"
                />
              </div>
            </div>

            {/* Champs déclarés par le modèle sélectionné */}
            {templateVariables.map((variable) => {
              const fieldId = `var_${variable.key}`;
              const value = form.variables[variable.key] ?? '';

              return (
                <div className="form-group" key={variable.key}>
                  <label className="form-label" htmlFor={fieldId}>
                    {variable.label}
                    {variable.required && <span className="form-required">*</span>}
                  </label>

                  {variable.type === 'textarea' ? (
                    <textarea
                      id={fieldId}
                      className="textarea"
                      rows={3}
                      value={value}
                      onChange={(e) => setVariable(variable.key, e.target.value)}
                      required={variable.required}
                    />
                  ) : (
                    <input
                      id={fieldId}
                      className="input"
                      type={variable.type === 'number' ? 'number' : variable.type === 'date' ? 'date' : 'text'}
                      value={value}
                      onChange={(e) => setVariable(variable.key, e.target.value)}
                      required={variable.required}
                    />
                  )}

                  {variable.help && <span className="form-hint">{variable.help}</span>}
                </div>
              );
            })}

            {templateVariables.length === 0 && (
              <p className="form-hint">
                Ce modèle ne demande aucune information supplémentaire.
              </p>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="wizard-form">
            <h2 className="wizard-step-title">Vérifiez avant de créer</h2>
            <div className="card">
              <dl className="recap">
                <div className="recap-row"><dt>Modèle</dt><dd>{selectedTemplate?.name}</dd></div>
                <div className="recap-row"><dt>Client</dt><dd>{selectedClient?.company_name}</dd></div>
                <div className="recap-row"><dt>Contact</dt><dd>{selectedClient?.contact_name} · {selectedClient?.email}</dd></div>
                <div className="recap-row recap-row--highlight">
                  <dt>Montant</dt>
                  <dd>{form.amount ? formatCurrency(form.amount) : '—'}</dd>
                </div>
                {form.duration_months && (
                  <div className="recap-row"><dt>Durée</dt><dd>{form.duration_months} mois</dd></div>
                )}
                {templateVariables.map((variable) => (
                  <div className="recap-row" key={variable.key}>
                    <dt>{variable.label}</dt>
                    <dd>{form.variables[variable.key] || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="form-hint mt-md">
              Le contrat sera créé en brouillon. Vous pourrez générer le PDF puis l'envoyer en signature.
            </p>
          </section>
        )}
      </div>

      <div className="wizard-nav">
        <button
          className="btn btn--secondary"
          onClick={() => (step === 0 ? navigate('/contracts') : setStep(step - 1))}
        >
          {step === 0 ? 'Annuler' : <><Icon name="arrowLeft" size={16} />Précédent</>}
        </button>

        {step < STEPS.length - 1 ? (
          <button className="btn btn--primary" onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Suivant
            <Icon name="arrowRight" size={16} />
          </button>
        ) : (
          <button className="btn btn--primary btn--lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <span className="spinner" /> : <><Icon name="check" size={16} />Créer le contrat</>}
          </button>
        )}
      </div>
    </div>
  );
}
