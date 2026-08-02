import { useEffect, useState } from 'react';
import api from '../../api/client';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/formatters';

export default function ClientsListPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const { addToast } = useToast();

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/api/clients');
      setClients(data);
    } catch { addToast('Erreur chargement clients', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter((c) =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditingClient(null); setModalOpen(true); };
  const openEdit = (client) => { setEditingClient(client); setModalOpen(true); };

  const handleSaved = () => {
    setModalOpen(false);
    fetchClients();
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce client ?')) return;
    try {
      await api.delete(`/api/clients/${id}`);
      addToast('Client supprimé', 'success');
      fetchClients();
    } catch { addToast('Erreur lors de la suppression', 'error'); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Chargement des clients..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>+ Ajouter un client</button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Aucun client"
          text="Ajoutez votre premier client pour commencer à générer des contrats."
          action={<button className="btn btn--primary" onClick={openCreate}>+ Ajouter un client</button>}
        />
      ) : (
        <>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <input
              className="input"
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Créé le</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.company_name}</td>
                    <td>{c.contact_name}</td>
                    <td>{c.email}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn--ghost btn--sm" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ClientFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        client={editingClient}
      />
    </div>
  );
}

/* ═══ Client Form Modal ═══ */
function ClientFormModal({ isOpen, onClose, onSaved, client }) {
  const { addToast } = useToast();
  const isEdit = !!client;
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', address: '', tax_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        company_name: client.company_name || '',
        contact_name: client.contact_name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        tax_id: client.tax_id || '',
      });
    } else {
      setForm({ company_name: '', contact_name: '', email: '', phone: '', address: '', tax_id: '' });
    }
  }, [client, isOpen]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/api/clients/${client.id}`, form);
        addToast('Client mis à jour', 'success');
      } else {
        await api.post('/api/clients', form);
        addToast('Client créé', 'success');
      }
      onSaved();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Modifier le client' : 'Nouveau client'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="form-group">
          <label className="form-label">Nom de l'entreprise *</label>
          <input className="input" name="company_name" value={form.company_name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label className="form-label">Nom du contact *</label>
          <input className="input" name="contact_name" value={form.contact_name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="input" name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input className="input" name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">N° fiscal</label>
            <input className="input" name="tax_id" value={form.tax_id} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Adresse</label>
          <textarea className="textarea" name="address" value={form.address} onChange={handleChange} rows={2} />
        </div>
        <div className="flex gap-sm" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? <span className="spinner" /> : isEdit ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
