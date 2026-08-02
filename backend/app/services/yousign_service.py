import httpx

from app.core.config import get_settings

settings = get_settings()


class YousignError(RuntimeError):
    pass


def _client() -> httpx.Client:
    if not settings.yousign_api_key:
        raise YousignError("YOUSIGN_API_KEY manquante : integration signature electronique non configuree.")
    return httpx.Client(
        base_url=settings.yousign_api_url,
        headers={"Authorization": f"Bearer {settings.yousign_api_key}"},
        timeout=30.0,
    )


def send_contract_for_signature(
    pdf_bytes: bytes, contract_reference: str, signer_name: str, signer_email: str
) -> str:
    """Cree une demande de signature Yousign et retourne l'identifiant de procedure."""
    with _client() as client:
        request_resp = client.post(
            "/signature_requests",
            json={"name": f"Contrat {contract_reference}", "delivery_mode": "email"},
        )
        request_resp.raise_for_status()
        signature_request_id = request_resp.json()["id"]

        doc_resp = client.post(
            f"/signature_requests/{signature_request_id}/documents",
            files={"file": (f"{contract_reference}.pdf", pdf_bytes, "application/pdf")},
            data={"nature": "signable_document"},
        )
        doc_resp.raise_for_status()

        signer_name_parts = signer_name.strip().split(" ", 1)
        first_name = signer_name_parts[0]
        last_name = signer_name_parts[1] if len(signer_name_parts) > 1 else first_name

        signer_resp = client.post(
            f"/signature_requests/{signature_request_id}/signers",
            json={
                "info": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": signer_email,
                    "locale": "fr",
                },
                "signature_level": "electronic_signature",
            },
        )
        signer_resp.raise_for_status()

        activate_resp = client.post(f"/signature_requests/{signature_request_id}/activate")
        activate_resp.raise_for_status()

        return signature_request_id


def get_signature_status(signature_request_id: str) -> str:
    with _client() as client:
        resp = client.get(f"/signature_requests/{signature_request_id}")
        resp.raise_for_status()
        return resp.json()["status"]
