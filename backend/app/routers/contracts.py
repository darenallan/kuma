from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.contract import Contract
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractRead, ContractSendForSignature
from app.services import contract_service, storage_service

router = APIRouter(prefix="/api/contracts", tags=["contracts"])


def _get_contract_or_404(db: Session, contract_id: int) -> Contract:
    contract = db.get(Contract, contract_id)
    if contract is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contrat introuvable")
    return contract


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
def create_contract(
    payload: ContractCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> Contract:
    return contract_service.create_contract(db, payload, created_by_id=current_user.id)


@router.get("", response_model=list[ContractRead])
def list_contracts(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
) -> list[Contract]:
    query = db.query(Contract)
    if status:
        query = query.filter(Contract.status == status)
    return query.order_by(Contract.created_at.desc()).offset(skip).limit(min(limit, 200)).all()


@router.get("/{contract_id}", response_model=ContractRead)
def get_contract(
    contract_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> Contract:
    return _get_contract_or_404(db, contract_id)


@router.post("/{contract_id}/generate", response_model=ContractRead)
@limiter.limit("20/minute")
def generate_contract_pdf(
    request: Request,
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Contract:
    contract = _get_contract_or_404(db, contract_id)
    return contract_service.generate_pdf(db, contract, actor_id=current_user.id)


@router.get("/{contract_id}/download")
def download_contract_pdf(
    contract_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> Response:
    contract = _get_contract_or_404(db, contract_id)
    if not contract.pdf_storage_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aucun PDF genere pour ce contrat")

    pdf_bytes = storage_service.load_decrypted_pdf(contract.pdf_storage_key)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{contract.reference}.pdf"'},
    )


@router.post("/{contract_id}/send-for-signature", response_model=ContractRead)
@limiter.limit("10/minute")
def send_contract_for_signature(
    request: Request,
    contract_id: int,
    payload: ContractSendForSignature,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Contract:
    contract = _get_contract_or_404(db, contract_id)
    return contract_service.send_for_signature(
        db, contract, payload.signer_name, payload.signer_email, actor_id=current_user.id
    )
