export default function StatsCard({ icon, value, label, color }) {
  return (
    <div className="card card--interactive animate-slide-up" style={{ '--delay': '0ms' }}>
      <div className="flex items-center gap-md">
        <div
          style={{
            width: 44, height: 44,
            borderRadius: 'var(--radius-md)',
            background: color ? `${color}22` : 'var(--accent-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem',
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}
