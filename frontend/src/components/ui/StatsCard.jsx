import Icon from './Icon';
import './StatsCard.css';

/**
 * `tone` mappe sur les tokens sémantiques plutôt que sur des couleurs brutes,
 * pour que la carte suive automatiquement le thème clair/sombre.
 */
export default function StatsCard({ icon, value, label, tone = 'accent', delay = 0 }) {
  return (
    <div className="stat-card animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <span className={`stat-card-icon stat-card-icon--${tone}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-label">{label}</span>
    </div>
  );
}
