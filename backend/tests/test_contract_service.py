from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.models.client import Client
from app.models.contract import ContractStatus
from app.models.template import ContractTemplate
from app.schemas.contract import ContractCreate
from app.services import contract_service, pdf_service, storage_service, yousign_service


@pytest.fixture
def client_and_template(db_session, admin_user):
    contract_client = Client(
        company_name="Acme SARL",
        contact_name="Jean Dupont",
        email="jean@acme-example.com",
        created_by_id=admin_user.id,
    )
    template = ContractTemplate(
        name="Prestation de service", filename="prestation_service.html", version=1, is_active=True
    )
    db_session.add_all([contract_client, template])
    db_session.commit()
    db_session.refresh(contract_client)
    db_session.refresh(template)
    return contract_client, template


def test_create_contract_starts_in_draft(db_session, admin_user, client_and_template):
    contract_client, template = client_and_template
    payload = ContractCreate(
        client_id=contract_client.id,
        template_id=template.id,
        variables={"prestation": "Developpement"},
        amount=Decimal("1500.00"),
        duration_months=6,
    )

    contract = contract_service.create_contract(db_session, payload, created_by_id=admin_user.id)

    assert contract.status == ContractStatus.DRAFT
    assert contract.reference.startswith("CTR-")
    assert contract.pdf_storage_key is None


def test_generate_pdf_moves_status_to_generated(db_session, admin_user, client_and_template, monkeypatch, tmp_path):
    contract_client, template = client_and_template
    monkeypatch.setattr(storage_service.settings, "storage_path", str(tmp_path))
    monkeypatch.setattr(pdf_service, "render_contract_pdf", lambda *a, **k: b"%PDF-fake-content")

    payload = ContractCreate(
        client_id=contract_client.id, template_id=template.id, variables={}, amount=Decimal("1000.00")
    )
    contract = contract_service.create_contract(db_session, payload, created_by_id=admin_user.id)

    updated = contract_service.generate_pdf(db_session, contract, actor_id=admin_user.id)

    assert updated.status == ContractStatus.GENERATED
    assert updated.pdf_storage_key is not None
    assert (tmp_path / updated.pdf_storage_key).exists()


def test_send_for_signature_requires_generated_status(db_session, admin_user, client_and_template):
    contract_client, template = client_and_template
    payload = ContractCreate(
        client_id=contract_client.id, template_id=template.id, variables={}, amount=Decimal("1000.00")
    )
    contract = contract_service.create_contract(db_session, payload, created_by_id=admin_user.id)

    with pytest.raises(HTTPException) as exc_info:
        contract_service.send_for_signature(
            db_session, contract, "Jean Dupont", "jean@acme-example.com", actor_id=admin_user.id
        )
    assert exc_info.value.status_code == 409


def test_send_for_signature_calls_yousign(db_session, admin_user, client_and_template, monkeypatch, tmp_path):
    contract_client, template = client_and_template
    monkeypatch.setattr(storage_service.settings, "storage_path", str(tmp_path))
    monkeypatch.setattr(pdf_service, "render_contract_pdf", lambda *a, **k: b"%PDF-fake-content")
    monkeypatch.setattr(yousign_service, "send_contract_for_signature", lambda *a, **k: "procedure-123")

    payload = ContractCreate(
        client_id=contract_client.id, template_id=template.id, variables={}, amount=Decimal("1000.00")
    )
    contract = contract_service.create_contract(db_session, payload, created_by_id=admin_user.id)
    contract = contract_service.generate_pdf(db_session, contract, actor_id=admin_user.id)

    updated = contract_service.send_for_signature(
        db_session, contract, "Jean Dupont", "jean@acme-example.com", actor_id=admin_user.id
    )

    assert updated.status == ContractStatus.SENT_FOR_SIGNATURE
    assert updated.yousign_procedure_id == "procedure-123"
