import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Icon from '../../components/ui/Icon';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate, getStatusInfo } from '../../utils/formatters';
import './ContractDetailPage.css';

const TIMELINE = [
  { status: 'draft', label: 'Brouillon', icon: 'pencil' },
  { status: 'generated', label: 'PDF généré', icon: 'contract' },
  { status: 'sent_for_signature', label: 'Envoyé en signature', icon: 'send' },
  { status: 'signed', label: 'Signé', icon: 'checkCircle' },
];

const VARIABLE_LABELS = {
  prestataire_nom: 'Prestataire',
  prestation: 'Objet de la prestation',
  clauses_specifiques: 'Clauses spécifiques',
};

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [signModal, setSignModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/contracts/${id}`)
      .then(({ data }) => { if (!cancelled) setContract(data); })
      .catch(() => {
        if (cancelled) return;
        addToast('Contrat introuvable', 'error');
        navigate('/contracts');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, navigate, addToast]);

  const handleGeneratePdf = async () => {
    setActionLoading('generate');
    try {
      const { data } = await api.post(`/api/contracts/${id}/generate`);
      setContract(data);
      addToast('PDF généré', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Génération impossible', 'error');
    } finally { setActionLoading(''); }
  };

  const handleDownload = async () => {
    setActionLoading('download');
    let url;
    try {
      const resp = await api.get(`/api/contracts/${id}/download`, { responseType: 'blob' });
      url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      addToast('Téléchargement impossible', 'error');
    } finally {
      // Libère l'URL objet quoi qu'il arrive : sinon le blob reste en mémoire.
      if (url) window.URL.revokeObjectURL(url);
      setActionLoading('');
    }
  };

  const openSignModal = () => {
    // Pré-remplit avec le contact client quand il est connu : moins de saisie, moins d'erreurs.
    setSignerName(contract?.client?.contact_name || '');
    setSignerEmail(contract?.client?.email || '');
    setSignModal(true);
  };

  const handleSendForSignature = async () => {
    if (!signerName.trim() || !signerEmail.trim()) return;
    setActionLoading('sign');
    try {
      const { data } = await api.post(`/api/contracts/${id}/send-for-signature`, {
        signer_name: signerName,
        signer_email: signerEmail,
      });
      setContract(data);
      setSignModal(false);
      addToast('Contrat envoyé en signature', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Envoi impossible', 'error');
    } finally { setActionLoading(''); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Chargement du contrat…" />;
  if (!contract) return null;

  const status = getStatusInfo(contract.status);
  const currentIndex = TIMELINE.findIndex((s) => s.status === contract.status);
  const isCancelled = contract.status === 'cancelled';
  const variables = Object.entries(contract.variables || {}).filter(([, v]) => v);

  return (
    <div>
      <Link to="/contracts" className="btn btn--ghost btn--sm mb-md" style={{ marginLeft: '-0.7rem' }}>
        <Icon name="arrowLeft" size={15} />
        Retour aux contrats
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{contract.reference}</h1>
          <div className="flex items-center gap-sm flex-wrap" style={{ marginTop: '0.4rem' }}>
            <Badge variant={status.variant}>{status.label}</Badge>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              Créé le {formatDate(contract.created_at)}
            </span>
          </div>
        </div>

        <div className="flex gap-sm flex-wrap">
          {contract.status === 'draft' && (
            <button className="btn btn--primary" onClick={handleGeneratePdf} disabled={!!actionLoading}>
              {actionLoading === 'generate'
                ? <span className="spinner" />
                : <><Icon name="contract" size={16} />Générer le PDF</>}
            </button>
          )}
          {contract.pdf_storage_key !== null && contract.status !== 'draft' && (
            <button className="btn btn--secondary" onClick={handleDownload} disabled={!!actionLoading}>
              {actionLoading === 'download'
                ? <span className="spinner" />
                : <><Icon name="download" size={16} />Télécharger</>}
            </button>
          )}
          {contract.status === 'generated' && (
            <button className="btn btn--primary" onClick={openSignModal} disabled={!!actionLoading}>
              <Icon name="signature" size={16} />
              Envoyer en signature
            </button>
          )}
        </div>
      </div>

      {/* Progression : un contrat annulé sort du parcours nominal */}
      {isCancelled ? (
        <div className="notice notice--danger mb-lg">
          <Icon name="alert" size={18} />
          <span>Ce contrat a été annulé.</span>
        </div>
      ) : (
        <ol className="timeline mb-lg">
          {TIMELINE.map((s, i) => {
            const done = currentIndex >= 0 && i <= currentIndex;
            const current = s.status === contract.status;
            return (
              <li
                key={s.status}
                className={`timeline-step ${done ? 'timeline-step--done' : ''} ${current ? 'timeline-step--current' : ''}`}
                aria-current={current ? 'step' : undefined}
              >
                <span className="timeline-dot">
                  <Icon name={done ? 'check' : s.icon} size={14} strokeWidth={done ? 3 : 1.75} />
                </span>
                <span className="timeline-label">{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid grid--split">
        <section className="card">
          <h2 className="card-title mb-md">Informations</h2>
          <dl className="detail-list">
            <div className="detail-row">
              <dt><Icon name="contract" size={15} />Référence</dt>
              <dd>{contract.reference}</dd>
            </div>
            <div className="detail-row">
              <dt><Icon name="money" size={15} />Montant</dt>
              <dd className="detail-amount">{formatCurrency(contract.amount)}</dd>
            </div>
            {contract.duration_months && (
              <div className="detail-row">
                <dt><Icon name="clock" size={15} />Durée</dt>
                <dd>{contract.duration_months} mois</dd>
              </div>
            )}
            <div className="detail-row">
              <dt><Icon name="calendar" size={15} />Créé le</dt>
              <dd>{formatDate(contract.created_at)}</dd>
            </div>
            {contract.signed_at && (
              <div className="detail-row">
                <dt><Icon name="checkCircle" size={15} />Signé le</dt>
                <dd>{formatDate(contract.signed_at)}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="card">
          <h2 className="card-title mb-md">Contenu du contrat</h2>
          {variables.length === 0 ? (
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              Aucune variable renseignée.
            </p>
          ) : (
            <dl className="detail-list">
              {variables.map(([key, value]) => (
                <div className="detail-row detail-row--stacked" key={key}>
                  <dt>{VARIABLE_LABELS[key] || key.replace(/_/g, ' ')}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <Modal isOpen={signModal} onClose={() => setSignModal(false)} title="Envoyer en signature" width="460px">
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
          Le contrat sera transmis par email au signataire via Yousign. Vous serez notifié dès qu'il sera signé.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="signer_name">
              Nom du signataire<span className="form-required">*</span>
            </label>
            <input
              id="signer_name"
              className="input"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Jean Dupont"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signer_email">
              Email du signataire<span className="form-required">*</span>
            </label>
            <input
              id="signer_email"
              className="input"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="jean@exemple.com"
              required
            />
          </div>

          <div className="flex gap-sm justify-end mt-md">
            <button className="btn btn--secondary" onClick={() => setSignModal(false)}>Annuler</button>
            <button
              className="btn btn--primary"
              onClick={handleSendForSignature}
              disabled={actionLoading === 'sign' || !signerName.trim() || !signerEmail.trim()}
            >
              {actionLoading === 'sign'
                ? <span className="spinner" />
                : <><Icon name="send" size={16} />Envoyer</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
