import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate, getStatusInfo } from '../../utils/formatters';
import './ContractDetailPage.css';

const TIMELINE_STEPS = ['draft', 'generated', 'sent_for_signature', 'signed'];

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

  const fetchContract = async () => {
    try {
      const { data } = await api.get(`/api/contracts/${id}`);
      setContract(data);
    } catch {
      addToast('Contrat introuvable', 'error');
      navigate('/contracts');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchContract(); }, [id]);

  const handleGeneratePdf = async () => {
    setActionLoading('generate');
    try {
      const { data } = await api.post(`/api/contracts/${id}/generate`);
      setContract(data);
      addToast('PDF généré avec succès !', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Erreur génération PDF', 'error');
    } finally { setActionLoading(''); }
  };

  const handleDownload = async () => {
    setActionLoading('download');
    try {
      const resp = await api.get(`/api/contracts/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.reference}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      addToast('PDF téléchargé', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Erreur téléchargement', 'error');
    } finally { setActionLoading(''); }
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
      addToast('Contrat envoyé en signature !', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Erreur envoi en signature', 'error');
    } finally { setActionLoading(''); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Chargement du contrat..." />;
  if (!contract) return null;

  const status = getStatusInfo(contract.status);
  const currentStepIndex = TIMELINE_STEPS.indexOf(contract.status);

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn--ghost btn--sm mb-md" onClick={() => navigate('/contracts')}>← Retour aux contrats</button>
          <h1 className="page-title">{contract.reference}</h1>
          <div className="flex items-center gap-sm" style={{ marginTop: 4 }}>
            <Badge variant={status.variant}>{status.label}</Badge>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Créé le {formatDate(contract.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-sm">
          {contract.status === 'draft' && (
            <button className="btn btn--primary" onClick={handleGeneratePdf} disabled={!!actionLoading}>
              {actionLoading === 'generate' ? <span className="spinner" /> : '📄 Générer le PDF'}
            </button>
          )}
          {(contract.status === 'generated' || contract.status === 'signed') && (
            <button className="btn btn--secondary" onClick={handleDownload} disabled={!!actionLoading}>
              {actionLoading === 'download' ? <span className="spinner" /> : '⬇️ Télécharger PDF'}
            </button>
          )}
          {contract.status === 'generated' && (
            <button className="btn btn--primary" onClick={() => setSignModal(true)} disabled={!!actionLoading}>
              ✍️ Envoyer en signature
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-container mb-lg">
        {TIMELINE_STEPS.map((s, i) => {
          const info = getStatusInfo(s);
          const isCompleted = i <= currentStepIndex && currentStepIndex >= 0;
          const isCurrent = s === contract.status;
          return (
            <div key={s} className={`timeline-step ${isCompleted ? 'timeline-step--done' : ''} ${isCurrent ? 'timeline-step--current' : ''}`}>
              <div className="timeline-dot">{isCompleted ? '✓' : i + 1}</div>
              <span className="timeline-label">{info.label}</span>
            </div>
          );
        })}
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
        <div className="card">
          <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Informations</h3>
          <div className="detail-rows">
            <div className="detail-row"><span>Référence</span><span>{contract.reference}</span></div>
            <div className="detail-row"><span>Montant</span><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(contract.amount)}</span></div>
            {contract.duration_months && <div className="detail-row"><span>Durée</span><span>{contract.duration_months} mois</span></div>}
            <div className="detail-row"><span>Créé le</span><span>{formatDate(contract.created_at)}</span></div>
            {contract.signed_at && <div className="detail-row"><span>Signé le</span><span>{formatDate(contract.signed_at)}</span></div>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Variables du contrat</h3>
          <div className="detail-rows">
            {Object.entries(contract.variables || {}).map(([key, val]) => (
              <div className="detail-row" key={key}>
                <span>{key.replace(/_/g, ' ')}</span>
                <span>{val || '—'}</span>
              </div>
            ))}
            {Object.keys(contract.variables || {}).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>Aucune variable</p>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <Modal isOpen={signModal} onClose={() => setSignModal(false)} title="Envoyer en signature">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
            Le contrat sera envoyé par email au signataire via Yousign.
          </p>
          <div className="form-group">
            <label className="form-label">Nom du signataire *</label>
            <input className="input" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Jean Dupont" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email du signataire *</label>
            <input className="input" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="jean@exemple.com" required />
          </div>
          <div className="flex gap-sm" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
            <button className="btn btn--secondary" onClick={() => setSignModal(false)}>Annuler</button>
            <button className="btn btn--primary" onClick={handleSendForSignature} disabled={actionLoading === 'sign'}>
              {actionLoading === 'sign' ? <span className="spinner" /> : 'Envoyer ✍️'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
