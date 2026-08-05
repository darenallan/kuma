import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.contract import Contract, ContractStatus
from app.models.template import ContractTemplate
from app.schemas.contract import ContractCreate
from app.services import (
    audit_service,
    pdf_service,
    storage_service,
    template_service,
    yousign_service,
)


def _generate_reference() -> str:
    return f"CTR-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:8].upper()}"


def create_contract(db: Session, data: ContractCreate, created_by_id: int) -> Contract:
    client = db.get(Client, data.client_id)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")

    template = db.get(ContractTemplate, data.template_id)
    if template is None or not template.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template de contrat introuvable ou inactif")

    contract = Contract(
        reference=_generate_reference(),
        client_id=data.client_id,
        template_id=data.template_id,
        created_by_id=created_by_id,
        variables=data.variables,
        amount=data.amount,
        duration_months=data.duration_months,
        status=ContractStatus.DRAFT,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    audit_service.record(
        db,
        action="contract.created",
        entity_type="contract",
        entity_id=contract.id,
        user_id=created_by_id,
        context={"reference": contract.reference},
    )
    return contract


def generate_pdf(db: Session, contract: Contract, actor_id: int) -> Contract:
    template = db.get(ContractTemplate, contract.template_id)
    client = db.get(Client, contract.client_id)
    if template is None or client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Donnees liees au contrat introuvables")

    if template.body:
        # Modèle composé dans l'interface : articles structurés, substitution sûre.
        pdf_bytes = pdf_service.render_custom_contract_pdf(
            template.body,
            template_service.build_context(contract, client, template),
            template_service.build_values(contract, client),
        )
    else:
        # Modèle livré avec l'application (fichier Jinja2 du dépôt).
        pdf_bytes = pdf_service.render_contract_pdf(
            template.filename,
            {"contract": contract, "client": client, **(contract.variables or {})},
        )
    contract.pdf_storage_key = storage_service.save_encrypted_pdf(contract.reference, pdf_bytes)
    contract.status = ContractStatus.GENERATED
    db.commit()
    db.refresh(contract)

    audit_service.record(
        db,
        action="contract.pdf_generated",
        entity_type="contract",
        entity_id=contract.id,
        user_id=actor_id,
        context={"reference": contract.reference},
    )
    return contract


def send_for_signature(db: Session, contract: Contract, signer_name: str, signer_email: str, actor_id: int) -> Contract:
    if contract.status != ContractStatus.GENERATED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Le contrat doit avoir un PDF genere avant envoi en signature"
        )
    if not contract.pdf_storage_key:
        raise HTTPException(status.HTTP_409_CONFLICT, "Aucun PDF associe a ce contrat")

    pdf_bytes = storage_service.load_decrypted_pdf(contract.pdf_storage_key)
    procedure_id = yousign_service.send_contract_for_signature(
        pdf_bytes, contract.reference, signer_name, signer_email
    )
    contract.yousign_procedure_id = procedure_id
    contract.status = ContractStatus.SENT_FOR_SIGNATURE
    db.commit()
    db.refresh(contract)

    audit_service.record(
        db,
        action="contract.sent_for_signature",
        entity_type="contract",
        entity_id=contract.id,
        user_id=actor_id,
        context={"reference": contract.reference},
    )
    return contract
