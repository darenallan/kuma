import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/ui/Icon';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      // Distingue panne réseau et refus d'identifiants : sans ça, une API
      // injoignable affiche "identifiants invalides" et envoie l'utilisateur
      // chercher le problème au mauvais endroit.
      if (!err.response) {
        setError("Le serveur est injoignable. Vérifiez votre connexion puis réessayez.");
      } else if (err.response.status === 401) {
        setError('Email ou mot de passe incorrect.');
      } else if (err.response.status === 429) {
        setError('Trop de tentatives. Patientez une minute avant de réessayer.');
      } else {
        setError(err.response?.data?.detail || 'Connexion impossible pour le moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-card">
          <span className="brand login-brand">
            <span className="brand-mark"><Icon name="bolt" size={18} strokeWidth={2} /></span>
            <span className="brand-text">Kuma</span>
          </span>

          <h1 className="login-title">Connexion</h1>
          <p className="login-subtitle">Accédez à votre espace de gestion des contrats.</p>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && (
              <p className="login-error" role="alert">
                <Icon name="alert" size={16} />
                <span>{error}</span>
              </p>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Adresse email</label>
              <input
                id="email"
                className="input"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Mot de passe</label>
              <input
                id="password"
                className="input"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button className="btn btn--primary btn--lg w-full" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="login-legal">
          Vos contrats sont chiffrés au repos et chaque action est tracée.
        </p>
      </div>

      <aside className="login-aside" aria-hidden="true">
        <div className="login-aside-inner">
          <p className="login-aside-title">
            Des contrats professionnels,<br />générés en quelques minutes.
          </p>
          <ul className="login-aside-list">
            <li><Icon name="template" size={18} /><span>Modèles réutilisables, zéro ressaisie</span></li>
            <li><Icon name="contract" size={18} /><span>Génération PDF automatique</span></li>
            <li><Icon name="signature" size={18} /><span>Signature électronique intégrée</span></li>
            <li><Icon name="checkCircle" size={18} /><span>Historique et traçabilité complète</span></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
