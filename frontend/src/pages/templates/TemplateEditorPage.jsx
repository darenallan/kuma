import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import Icon from '../../components/ui/Icon';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import './TemplateEditorPage.css';

const VARIABLE_TYPES = [
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
];

const EMPTY_ARTICLE = { title: '', content: '' };

/** Dérive une clé technique valide à partir d'un libellé saisi en français. */
function slugify(label) {
  return label
    .normalize('NFD')
    // Retire les diacritiques (accents) isolés par la décomposition NFD.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'v$1')
    .slice(0, 40);
}

export default function TemplateEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [systemVariables, setSystemVariables] = useState([]);
  const [errors, setErrors] = useState([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [intro, setIntro] = useState('');
  const [articles, setArticles] = useState([{ ...EMPTY_ARTICLE }]);
  const [variables, setVariables] = useState([]);

  // Mémorise le dernier champ texte actif pour y insérer la variable choisie.
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    api.get('/api/templates/variables')
      .then(({ data }) => setSystemVariables(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/api/templates/${id}`)
      .then(({ data }) => {
        if (data.is_builtin) {
          addToast('Ce modèle est intégré. Dupliquez-le pour le personnaliser.', 'info');
          navigate('/templates');
          return;
        }
        setName(data.name || '');
        setDescription(data.description || '');
        setIntro(data.body?.intro || '');
        setArticles(data.body?.articles?.length ? data.body.articles : [{ ...EMPTY_ARTICLE }]);
        setVariables(data.variables_schema || []);
      })
      .catch(() => {
        addToast('Modèle introuvable', 'error');
        navigate('/templates');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, addToast]);

  /* ═══ Variables ═══ */
  const addVariable = () =>
    setVariables((v) => [...v, { key: '', label: '', type: 'text', required: false, help: '' }]);

  const updateVariable = (index, patch) =>
    setVariables((v) => v.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const removeVariable = (index) => setVariables((v) => v.filter((_, i) => i !== index));

  /* ═══ Articles ═══ */
  const addArticle = () => setArticles((a) => [...a, { ...EMPTY_ARTICLE }]);

  const updateArticle = (index, patch) =>
    setArticles((a) => a.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const removeArticle = (index) => setArticles((a) => a.filter((_, i) => i !== index));

  const moveArticle = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= articles.length) return;
    setArticles((a) => {
      const next = [...a];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  /** Insère {{ cle }} à la position du curseur du dernier champ actif. */
  const insertVariable = (key) => {
    const field = lastFocusedRef.current;
    const token = `{{ ${key} }}`;

    if (!field) {
      addToast('Placez le curseur dans un texte avant d’insérer une variable.', 'info');
      return;
    }

    const { element, kind, index } = field;
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;
    const next = element.value.slice(0, start) + token + element.value.slice(end);

    if (kind === 'intro') setIntro(next);
    else updateArticle(index, { content: next });

    // Repositionne le curseur après le jeton inséré.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const trackFocus = (element, kind, index) => {
    lastFocusedRef.current = { element, kind, index };
  };

  /* ═══ Validation & envoi ═══ */
  const buildPayload = () => ({
    name: name.trim(),
    description: description.trim() || null,
    body: {
      intro: intro.trim() || null,
      articles: articles
        .filter((a) => a.title.trim() && a.content.trim())
        .map((a) => ({ title: a.title.trim(), content: a.content.trim() })),
    },
    variables_schema: variables
      .filter((v) => v.key.trim() && v.label.trim())
      .map((v) => ({
        key: v.key.trim(),
        label: v.label.trim(),
        type: v.type,
        required: !!v.required,
        help: v.help?.trim() || null,
      })),
  });

  const localErrors = () => {
    const found = [];
    if (!name.trim()) found.push('Le nom du modèle est obligatoire.');
    if (!articles.some((a) => a.title.trim() && a.content.trim())) {
      found.push('Ajoutez au moins un article avec un titre et un contenu.');
    }
    variables.forEach((v, i) => {
      if (v.label.trim() && !v.key.trim()) found.push(`Variable ${i + 1} : la clé est vide.`);
    });
    return found;
  };

  /** Traduit les erreurs de validation FastAPI en messages lisibles. */
  const readApiErrors = (err) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return [detail];
    if (Array.isArray(detail)) return detail.map((d) => d.msg?.replace(/^Value error, /, '') || 'Champ invalide');
    return ['Une erreur est survenue.'];
  };

  const handlePreview = async () => {
    const found = localErrors();
    if (found.length) { setErrors(found); return; }

    setErrors([]);
    setPreviewing(true);
    let url;
    try {
      const payload = buildPayload();
      const resp = await api.post(
        '/api/templates/preview',
        { name: payload.name, body: payload.body, variables_schema: payload.variables_schema },
        { responseType: 'blob' },
      );
      url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      // La réponse d'erreur arrive en blob : il faut la relire en texte pour la comprendre.
      if (err.response?.data instanceof Blob) {
        try {
          const parsed = JSON.parse(await err.response.data.text());
          err.response.data = parsed;
        } catch { /* réponse non JSON */ }
      }
      setErrors(readApiErrors(err));
    } finally {
      // Laisse le temps à l'onglet d'ouvrir le blob avant de libérer l'URL.
      if (url) setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    const found = localErrors();
    if (found.length) { setErrors(found); return; }

    setErrors([]);
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await api.patch(`/api/templates/${id}`, payload);
        addToast('Modèle mis à jour', 'success');
      } else {
        await api.post('/api/templates', payload);
        addToast('Modèle créé', 'success');
      }
      navigate('/templates');
    } catch (err) {
      setErrors(readApiErrors(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Chargement du modèle…" />;

  return (
    <div>
      <button className="btn btn--ghost btn--sm mb-md" style={{ marginLeft: '-0.7rem' }} onClick={() => navigate('/templates')}>
        <Icon name="arrowLeft" size={15} />
        Retour aux modèles
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Modifier le modèle' : 'Nouveau modèle'}</h1>
          <p className="page-subtitle">
            Composez le contrat en articles. Les variables seront demandées à chaque création de contrat.
          </p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <button className="btn btn--secondary" onClick={handlePreview} disabled={previewing || saving}>
            {previewing ? <span className="spinner" /> : <><Icon name="eye" size={16} />Aperçu PDF</>}
          </button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || previewing}>
            {saving ? <span className="spinner" /> : <><Icon name="check" size={16} />{isEdit ? 'Enregistrer' : 'Créer le modèle'}</>}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="editor-errors mb-lg" role="alert">
          <Icon name="alert" size={18} />
          <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <div className="editor-layout">
        <div className="editor-main">
          <section className="card mb-md">
            <h2 className="card-title mb-md">Informations générales</h2>
            <div className="form-group mb-md">
              <label className="form-label" htmlFor="tpl_name">
                Nom du modèle<span className="form-required">*</span>
              </label>
              <input
                id="tpl_name" className="input" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contrat de montage vidéo"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tpl_desc">Description</label>
              <input
                id="tpl_desc" className="input" value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="À quoi sert ce modèle ?"
              />
            </div>
          </section>

          <section className="card mb-md">
            <h2 className="card-title mb-md">Préambule</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="tpl_intro">Texte d'introduction</label>
              <textarea
                id="tpl_intro" className="textarea" rows={4} value={intro}
                onChange={(e) => setIntro(e.target.value)}
                onFocus={(e) => trackFocus(e.target, 'intro')}
                onClick={(e) => trackFocus(e.target, 'intro')}
                placeholder="Entre {{ prestataire_nom }} et {{ client_entreprise }}…"
              />
              <span className="form-hint">Apparaît avant les articles. Optionnel.</span>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Articles</h2>
              <span className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                {articles.length} article{articles.length !== 1 ? 's' : ''}
              </span>
            </div>

            {articles.map((article, index) => (
              <article className="article-card" key={index}>
                <div className="article-head">
                  <span className="article-num">Article {index + 1}</span>
                  <div className="flex gap-xs">
                    <button
                      className="btn btn--ghost btn--icon btn--sm" onClick={() => moveArticle(index, -1)}
                      disabled={index === 0} aria-label="Monter l'article" title="Monter"
                    >
                      <Icon name="chevronUp" size={16} />
                    </button>
                    <button
                      className="btn btn--ghost btn--icon btn--sm" onClick={() => moveArticle(index, 1)}
                      disabled={index === articles.length - 1} aria-label="Descendre l'article" title="Descendre"
                    >
                      <Icon name="chevronDown" size={16} />
                    </button>
                    <button
                      className="btn btn--ghost btn--icon btn--sm" onClick={() => removeArticle(index)}
                      disabled={articles.length === 1} aria-label="Supprimer l'article" title="Supprimer"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                <div className="form-group mb-md">
                  <label className="form-label" htmlFor={`art_title_${index}`}>Titre</label>
                  <input
                    id={`art_title_${index}`} className="input" value={article.title}
                    onChange={(e) => updateArticle(index, { title: e.target.value })}
                    placeholder="Objet du contrat"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor={`art_content_${index}`}>Contenu</label>
                  <textarea
                    id={`art_content_${index}`} className="textarea" rows={5} value={article.content}
                    onChange={(e) => updateArticle(index, { content: e.target.value })}
                    onFocus={(e) => trackFocus(e.target, 'article', index)}
                    onClick={(e) => trackFocus(e.target, 'article', index)}
                    placeholder="Le prestataire s'engage à livrer {{ nb_videos }} vidéos…"
                  />
                  <span className="form-hint">Un retour à la ligne crée un nouveau paragraphe.</span>
                </div>
              </article>
            ))}

            <button className="btn btn--secondary w-full mt-md" onClick={addArticle}>
              <Icon name="plus" size={16} />
              Ajouter un article
            </button>
          </section>
        </div>

        {/* ═══ Panneau des variables ═══ */}
        <aside className="editor-aside">
          <div className="card editor-sticky">
            <div className="card-header">
              <h2 className="card-title">Variables</h2>
            </div>
            <p className="form-hint mb-md">
              Cliquez sur une variable pour l'insérer à l'endroit du curseur.
            </p>

            {variables.length > 0 && (
              <div className="var-section">
                <p className="var-section-title">Propres à ce modèle</p>
                {variables.map((variable, index) => (
                  <div className="var-item" key={index}>
                    <div className="var-item-head">
                      <button
                        type="button" className="var-chip"
                        onClick={() => variable.key && insertVariable(variable.key)}
                        disabled={!variable.key}
                        title={variable.key ? `Insérer {{ ${variable.key} }}` : 'Renseignez un libellé'}
                      >
                        {`{{ ${variable.key || '…'} }}`}
                      </button>
                      <button
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={() => removeVariable(index)}
                        aria-label="Supprimer la variable"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>

                    <input
                      className="input" value={variable.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        // La clé suit le libellé tant que l'utilisateur ne l'a pas figée.
                        const autoKey = slugify(variable.label) === variable.key || !variable.key;
                        updateVariable(index, autoKey ? { label, key: slugify(label) } : { label });
                      }}
                      placeholder="Libellé affiché (ex. Nombre de vidéos)"
                      aria-label="Libellé de la variable"
                    />

                    <div className="var-item-row">
                      <select
                        className="select" value={variable.type}
                        onChange={(e) => updateVariable(index, { type: e.target.value })}
                        aria-label="Type de la variable"
                      >
                        {VARIABLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <label className="var-required">
                        <input
                          type="checkbox" checked={!!variable.required}
                          onChange={(e) => updateVariable(index, { required: e.target.checked })}
                        />
                        Obligatoire
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn--secondary btn--sm w-full" onClick={addVariable}>
              <Icon name="plus" size={14} />
              Ajouter une variable
            </button>

            <div className="var-section mt-lg">
              <p className="var-section-title">Fournies automatiquement</p>
              <div className="var-chips">
                {systemVariables.map((v) => (
                  <button
                    key={v.key} type="button" className="var-chip var-chip--system"
                    onClick={() => insertVariable(v.key)} title={v.label}
                  >
                    {`{{ ${v.key} }}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
