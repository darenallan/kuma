from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: int,
    user_id: int | None = None,
    context: dict | None = None,
) -> AuditLog:
    """Enregistre une action sensible (generation, envoi, signature) pour la tracabilite RGPD.

    `context` ne doit jamais contenir de donnees personnelles en clair.
    """
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        context=context or {},
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
