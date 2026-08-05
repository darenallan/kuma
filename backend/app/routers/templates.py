from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user, require_roles
from app.models.template import ContractTemplate
from app.models.user import User, UserRole
from app.schemas.template import (
    RESERVED_KEYS,
    ContractTemplateCreate,
    ContractTemplateRead,
    ContractTemplateUpdate,
    TemplatePreviewRequest,
)
from app.services import audit_service, pdf_service, template_service

router = APIRouter(prefix="/api/templates", tags=["templates"])

# Rédiger un modèle engage tous les contrats produits ensuite : réservé aux profils habilités.
require_editor = require_roles(UserRole.ADMIN, UserRole.MANAGER)


def _get_template_or_404(db: Session, template_id: int) -> ContractTemplate:
    template = db.get(ContractTemplate, template_id)
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Modèle introuvable")
    return template


def _reject_if_builtin(template: ContractTemplate) -> None:
    if template.is_builtin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Ce modèle est fourni avec l'application. Dupliquez-le pour le personnaliser.",
        )


@router.get("/variables", tags=["templates"])
def list_reserved_variables(_: User = Depends(get_current_user)) -> list[dict]:
    """Variables système utilisables dans tout modèle, sans avoir à les déclarer."""
    labels = {
        "reference": "Référence du contrat",
        "date": "Date du jour",
        "montant": "Montant (formaté en FCFA)",
        "duree": "Durée",
        "client_entreprise": "Nom de l'entreprise cliente",
        "client_contact": "Nom du contact client",
        "client_email": "Email du client",
        "client_adresse": "Adresse du client",
        "client_telephone": "Téléphone du client",
    }
    return [{"key": key, "label": labels[key]} for key in sorted(RESERVED_KEYS)]


@router.post("", response_model=ContractTemplateRead, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: ContractTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> ContractTemplate:
    template = ContractTemplate(
        name=payload.name,
        description=payload.description,
        body=payload.body.model_dump(),
        variables_schema=[v.model_dump() for v in payload.variables_schema],
        is_builtin=False,
        created_by_id=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    audit_service.record(
        db,
        action="template.created",
        entity_type="template",
        entity_id=template.id,
        user_id=current_user.id,
        context={"name": template.name},
    )
    return template


@router.get("", response_model=list[ContractTemplateRead])
def list_templates(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    active_only: bool = True,
) -> list[ContractTemplate]:
    query = db.query(ContractTemplate)
    if active_only:
        query = query.filter(ContractTemplate.is_active.is_(True))
    return query.order_by(ContractTemplate.created_at.desc()).all()


@router.get("/{template_id}", response_model=ContractTemplateRead)
def get_template(
    template_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> ContractTemplate:
    return _get_template_or_404(db, template_id)


@router.patch("/{template_id}", response_model=ContractTemplateRead)
def update_template(
    template_id: int,
    payload: ContractTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> ContractTemplate:
    template = _get_template_or_404(db, template_id)

    data = payload.model_dump(exclude_unset=True)
    # Un modèle fourni avec l'app reste activable/désactivable, mais son contenu est figé.
    if template.is_builtin and (set(data) - {"is_active"}):
        _reject_if_builtin(template)

    if "body" in data and data["body"] is not None:
        template.body = payload.body.model_dump()
        # Le contenu change : on incrémente la version pour garder trace des révisions.
        template.version += 1
    if "variables_schema" in data and data["variables_schema"] is not None:
        template.variables_schema = [v.model_dump() for v in payload.variables_schema]
    for field in ("name", "description", "is_active"):
        if field in data:
            setattr(template, field, data[field])

    db.commit()
    db.refresh(template)

    audit_service.record(
        db,
        action="template.updated",
        entity_type="template",
        entity_id=template.id,
        user_id=current_user.id,
        context={"version": template.version},
    )
    return template


@router.post("/{template_id}/duplicate", response_model=ContractTemplateRead, status_code=status.HTTP_201_CREATED)
def duplicate_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> ContractTemplate:
    """Copie un modèle (y compris fourni avec l'app) pour le personnaliser."""
    source = _get_template_or_404(db, template_id)

    if source.is_builtin and not source.body:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Ce modèle intégré ne peut pas encore être dupliqué. Créez un nouveau modèle.",
        )

    copy = ContractTemplate(
        name=f"{source.name} (copie)",
        description=source.description,
        body=source.body,
        variables_schema=source.variables_schema,
        is_builtin=False,
        created_by_id=current_user.id,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)

    audit_service.record(
        db,
        action="template.duplicated",
        entity_type="template",
        entity_id=copy.id,
        user_id=current_user.id,
        context={"source_id": source.id},
    )
    return copy


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> None:
    """Désactive le modèle plutôt que de le supprimer.

    Les contrats déjà produits y font référence : une suppression réelle
    casserait leur historique et la traçabilité exigée en cas de litige.
    """
    template = _get_template_or_404(db, template_id)
    _reject_if_builtin(template)

    template.is_active = False
    db.commit()

    audit_service.record(
        db,
        action="template.deactivated",
        entity_type="template",
        entity_id=template.id,
        user_id=current_user.id,
        context={"name": template.name},
    )


@router.post("/preview")
@limiter.limit("20/minute")
def preview_template(
    request: Request,
    payload: TemplatePreviewRequest,
    _: User = Depends(require_editor),
) -> Response:
    """Rend un PDF d'essai avec des données fictives, sans rien enregistrer."""
    context, values = template_service.build_preview_data(
        payload.name, [v.model_dump() for v in payload.variables_schema]
    )
    pdf_bytes = pdf_service.render_custom_contract_pdf(payload.body.model_dump(), context, values)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="apercu.pdf"'},
    )
