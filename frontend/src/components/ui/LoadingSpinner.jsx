export default function LoadingSpinner({ size = 'default', text }) {
  return (
    <div className="empty-state">
      <div className={size === 'lg' ? 'spinner spinner--lg' : 'spinner'} />
      {text && <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{text}</p>}
    </div>
  );
}
