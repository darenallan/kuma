def test_create_and_list_client(client, auth_headers):
    response = client.post(
        "/api/clients",
        json={
            "company_name": "Acme SARL",
            "contact_name": "Jean Dupont",
            "email": "jean@acme-example.com",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    created = response.json()
    assert created["company_name"] == "Acme SARL"

    response = client.get("/api/clients", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_missing_client_returns_404(client, auth_headers):
    response = client.get("/api/clients/999", headers=auth_headers)
    assert response.status_code == 404


def test_create_client_requires_auth(client):
    response = client.post(
        "/api/clients",
        json={"company_name": "Acme", "contact_name": "Jean", "email": "jean@acme-example.com"},
    )
    assert response.status_code == 401
