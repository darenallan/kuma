import Icon from './Icon';

export default function EmptyState({ icon = 'inbox', title, text, action }) {
  return (
    <div className="empty-state animate-fade">
      <div className="empty-state-icon">
        <Icon name={icon} size={26} />
      </div>
      <p className="empty-state-title">{title}</p>
      {text && <p className="empty-state-text">{text}</p>}
      {action && <div style={{ marginTop: 'var(--space-lg)' }}>{action}</div>}
    </div>
  );
}
