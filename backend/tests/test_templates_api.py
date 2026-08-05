from app.models.template import ContractTemplate
from app.models.user import User, UserRole
from app.core.security import hash_password

VALID_PAYLOAD = {
    "name": "Contrat montage vidéo",
    "description": "Pour les prestations audiovisuelles",
    "variables_schema": [
        {"key": "nb_videos", "label": "Nombre de vidéos", "type": "number", "required": True},
    ],
    "body": {
        "intro": "Entre les parties soussignées.",
        "articles": [
            {"title": "Objet", "content": "Livraison de {{ nb_videos }} vidéos pour {{ client_entreprise }}."},
        ],
    },
}


def test_create_template(client, auth_headers):
    response = client.post("/api/templates", json=VALID_PAYLOAD, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Contrat montage vidéo"
    assert body["is_builtin"] is False
    assert body["variables_schema"][0]["key"] == "nb_videos"


def test_create_requires_authentication(client):
    response = client.post("/api/templates", json=VALID_PAYLOAD)
    assert response.status_code == 401


def test_create_forbidden_for_simple_user(client, db_session):
    """Rédiger un modèle engage tous les contrats produits ensuite : rôle requis."""
    db_session.add(User(
        email="simple@example.com",
        hashed_password=hash_password("SuperSecret123"),
        full_name="Simple",
        role=UserRole.USER,
    ))
    db_session.commit()

    token = client.post(
        "/api/auth/login", json={"email": "simple@example.com", "password": "SuperSecret123"}
    ).json()["access_token"]

    response = client.post(
        "/api/templates", json=VALID_PAYLOAD, headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


def test_undeclared_variable_is_rejected(client, auth_headers):
    """Une faute de frappe dans une variable doit être bloquée à la saisie,
    pas découverte dans un contrat déjà envoyé au client."""
    payload = {
        **VALID_PAYLOAD,
        "body": {
            "intro": None,
            "articles": [{"title": "Objet", "content": "Livraison de {{ nb_video }} vidéos."}],
        },
    }
    response = client.post("/api/templates", json=payload, headers=auth_headers)
    assert response.status_code == 422
    assert "nb_video" in str(response.json())


def test_reserved_variable_key_is_rejected(client, auth_headers):
    payload = {
        **VALID_PAYLOAD,
        "variables_schema": [{"key": "montant", "label": "Mon montant", "type": "text"}],
        "body": {"intro": None, "articles": [{"title": "A", "content": "{{ montant }}"}]},
    }
    response = client.post("/api/templates", json=payload, headers=auth_headers)
    assert response.status_code == 422
    assert "réservée" in str(response.json())


def test_invalid_variable_key_is_rejected(client, auth_headers):
    payload = {
        **VALID_PAYLOAD,
        "variables_schema": [{"key": "Nb-Videos!", "label": "X", "type": "text"}],
        "body": {"intro": None, "articles": [{"title": "A", "content": "texte"}]},
    }
    response = client.post("/api/templates", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_duplicate_variable_keys_rejected(client, auth_headers):
    payload = {
        **VALID_PAYLOAD,
        "variables_schema": [
            {"key": "champ", "label": "A", "type": "text"},
            {"key": "champ", "label": "B", "type": "text"},
        ],
        "body": {"intro": None, "articles": [{"title": "A", "content": "{{ champ }}"}]},
    }
    response = client.post("/api/templates", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_update_bumps_version_when_body_changes(client, auth_headers):
    created = client.post("/api/templates", json=VALID_PAYLOAD, headers=auth_headers).json()
    assert created["version"] == 1

    response = client.patch(
        f"/api/templates/{created['id']}",
        json={"body": {"intro": None, "articles": [{"title": "Objet", "content": "Nouveau texte."}]}},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["version"] == 2


def test_builtin_template_content_is_protected(client, auth_headers, db_session):
    builtin = ContractTemplate(
        name="Intégré", filename="prestation_service.html", is_builtin=True, variables_schema=[]
    )
    db_session.add(builtin)
    db_session.commit()
    db_session.refresh(builtin)

    response = client.patch(
        f"/api/templates/{builtin.id}",
        json={"name": "Renommé"},
        headers=auth_headers,
    )
    assert response.status_code == 403

    # Mais il reste désactivable.
    response = client.patch(
        f"/api/templates/{builtin.id}", json={"is_active": False}, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_delete_deactivates_instead_of_removing(client, auth_headers, db_session):
    """Les contrats émis référencent le modèle : sa suppression casserait l'historique."""
    created = client.post("/api/templates", json=VALID_PAYLOAD, headers=auth_headers).json()

    response = client.delete(f"/api/templates/{created['id']}", headers=auth_headers)
    assert response.status_code == 204

    still_there = db_session.get(ContractTemplate, created["id"])
    assert still_there is not None
    assert still_there.is_active is False


def test_duplicate_creates_editable_copy(client, auth_headers):
    created = client.post("/api/templates", json=VALID_PAYLOAD, headers=auth_headers).json()

    response = client.post(f"/api/templates/{created['id']}/duplicate", headers=auth_headers)
    assert response.status_code == 201
    copy = response.json()
    assert copy["id"] != created["id"]
    assert copy["name"] == "Contrat montage vidéo (copie)"
    assert copy["is_builtin"] is False
    assert copy["body"] == created["body"]


def test_list_hides_inactive_by_default(client, auth_headers):
    created = client.post("/api/templates", json=VALID_PAYLOAD, headers=auth_headers).json()
    client.delete(f"/api/templates/{created['id']}", headers=auth_headers)

    active = client.get("/api/templates", headers=auth_headers).json()
    assert all(t["id"] != created["id"] for t in active)

    every = client.get("/api/templates", params={"active_only": False}, headers=auth_headers).json()
    assert any(t["id"] == created["id"] for t in every)


def test_reserved_variables_endpoint_lists_system_fields(client, auth_headers):
    response = client.get("/api/templates/variables", headers=auth_headers)
    assert response.status_code == 200
    keys = {v["key"] for v in response.json()}
    assert "client_entreprise" in keys
    assert "montant" in keys
