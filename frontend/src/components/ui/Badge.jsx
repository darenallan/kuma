/**
 * `dot` affiche une pastille en plus de la couleur : l'information de statut
 * ne doit jamais reposer sur la seule teinte (daltonisme, impression N&B).
 */
export default function Badge({ variant = 'neutral', dot = true, children }) {
  return (
    <span className={`badge badge--${variant}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
