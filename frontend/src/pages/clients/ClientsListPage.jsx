import { useEffect, useState } from 'react';
import api from '../../api/client';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/formatters';

export default function ClientsListPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/api/clients');
      setClients(data);
    } catch {
      addToast('Impossible de charger les clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(q) ||
      c.contact_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const openCreate = () => { setEditingClient(null); setModalOpen(true); };
  const openEdit = (client) => { setEditingClient(client); setModalOpen(true); };

  const handleSaved = () => { setModalOpen(false); fetchClients(); };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/clients/${deletingClient.id}`);
      addToast('Client supprimé', 'success');
      setDeletingClient(null);
      fetchClients();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Suppression impossible', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Chargement des clients…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            {clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>
          <Icon name="plus" size={16} />
          Ajouter un client
        </button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon="users"
          title="Aucun client"
          text="Ajoutez votre premier client pour pouvoir générer des contrats à son nom."
          action={
            <button className="btn btn--primary" onClick={openCreate}>
              <Icon name="plus" size={16} />
              Ajouter un client
            </button>
          }
        />
      ) : (
        <>
          <div className="input-group mb-md" style={{ maxWidth: 360 }}>
            <Icon name="search" size={16} />
            <input
              className="input"
              type="search"
              placeholder="Rechercher un client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher un client"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="Aucun résultat"
              text={`Aucun client ne correspond à « ${search} ».`}
            />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Entreprise</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Ajouté le</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="table-cell-strong">{c.company_name}</td>
                      <td>{c.contact_name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone || '—'}</td>
                      <td>{formatDate(c.created_at)}</td>
                      <td>
                        <div className="flex gap-xs justify-end">
                          <button
                            className="btn btn--ghost btn--icon btn--sm"
                            onClick={() => openEdit(c)}
                            aria-label={`Modifier ${c.company_name}`}
                            title="Modifier"
                          >
                            <Icon name="pencil" size={16} />
                          </button>
                          <button
                            className="btn btn--ghost btn--icon btn--sm"
                            onClick={() => setDeletingClient(c)}
                            aria-label={`Supprimer ${c.company_name}`}
                            title="Supprimer"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ClientFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        client={editingClient}
      />

      <Modal
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        title="Supprimer ce client ?"
        width="420px"
      >
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong>{deletingClient?.company_name}</strong> sera définitivement retiré de votre liste.
          Cette action est irréversible.
        </p>
        <div className="flex gap-sm justify-end mt-lg">
          <button className="btn btn--secondary" onClick={() => setDeletingClient(null)}>Annuler</button>
          <button className="btn btn--danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : <><Icon name="trash" size={16} />Supprimer</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ═══ Formulaire client ═══ */
const EMPTY_CLIENT = { company_name: '', contact_name: '', email: '', phone: '', address: '', tax_id: '' };

function ClientFormModal({ isOpen, onClose, onSaved, client }) {
  const { addToast } = useToast();
  const isEdit = !!client;
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(client
      ? {
          company_name: client.company_name || '',
          contact_name: client.contact_name || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          tax_id: client.tax_id || '',
        }
      : EMPTY_CLIENT);
  }, [client, isOpen]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

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
      const detail = err.response?.data?.detail;
      addToast(typeof detail === 'string' ? detail : 'Enregistrement impossible', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Modifier le client' : 'Nouveau client'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="company_name">
            Nom de l'entreprise<span className="form-required">*</span>
          </label>
          <input id="company_name" className="input" name="company_name" value={form.company_name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="contact_name">
            Personne à contacter<span className="form-required">*</span>
          </label>
          <input id="contact_name" className="input" name="contact_name" value={form.contact_name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="client_email">
            Email<span className="form-required">*</span>
          </label>
          <input id="client_email" className="input" name="email" type="email" value={form.email} onChange={handleChange} required />
          <span className="form-hint">Utilisé pour l'envoi du contrat en signature.</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Téléphone</label>
            <input id="phone" className="input" name="phone" type="tel" value={form.phone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tax_id">N° fiscal</label>
            <input id="tax_id" className="input" name="tax_id" value={form.tax_id} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="address">Adresse</label>
          <textarea id="address" className="textarea" name="address" value={form.address} onChange={handleChange} rows={2} />
        </div>

        <div className="flex gap-sm justify-end mt-md">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? <span className="spinner" /> : isEdit ? 'Enregistrer' : 'Créer le client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
