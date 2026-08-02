from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.template import ContractTemplate
from app.models.user import User, UserRole
from app.schemas.template import ContractTemplateCreate, ContractTemplateRead

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.post("", response_model=ContractTemplateRead, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: ContractTemplateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
) -> ContractTemplate:
    template = ContractTemplate(**payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
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
    return query.all()


@router.get("/{template_id}", response_model=ContractTemplateRead)
def get_template(
    template_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> ContractTemplate:
    template = db.get(ContractTemplate, template_id)
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template introuvable")
    return template
