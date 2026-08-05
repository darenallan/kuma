import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("STORAGE_ENCRYPTION_KEY", "6qYh0GkNbF1JqEXTMSlxDXV1M5eXAe6h3ZKz3P8p4Yk=")
os.environ.setdefault("STORAGE_PATH", "./storage/test-contracts")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.rate_limit import limiter
from app.core.security import hash_password
from app.main import app
from app.models.user import User, UserRole

# La suite se connecte plusieurs fois par minute via la fixture d'authentification :
# laisser le rate limiting actif rendrait les tests dépendants de leur ordre.
limiter.enabled = False

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def _fresh_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_user(db_session):
    user = User(
        email="admin@kuma-test.example.com",
        hashed_password=hash_password("SuperSecret123"),
        full_name="Admin Kuma",
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, admin_user):
    response = client.post(
        "/api/auth/login", json={"email": admin_user.email, "password": "SuperSecret123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
