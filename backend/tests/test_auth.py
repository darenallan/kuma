from app.models.user import UserRole


def test_login_success(client, admin_user):
    response = client.post(
        "/api/auth/login", json={"email": admin_user.email, "password": "SuperSecret123"}
    )
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_login_wrong_password(client, admin_user):
    response = client.post(
        "/api/auth/login", json={"email": admin_user.email, "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_login_unknown_email(client):
    response = client.post(
        "/api/auth/login", json={"email": "nobody@kuma-test.example.com", "password": "whatever123"}
    )
    assert response.status_code == 401


def test_register_requires_admin(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "new@kuma-test.example.com", "password": "SomePass123", "full_name": "New User"},
    )
    assert response.status_code == 401


def test_register_as_admin_creates_user(client, auth_headers):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "new@kuma-test.example.com",
            "password": "SomePass123",
            "full_name": "New User",
            "role": UserRole.USER.value,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@kuma-test.example.com"
    assert "hashed_password" not in body


def test_me_requires_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user(client, auth_headers, admin_user):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == admin_user.email
