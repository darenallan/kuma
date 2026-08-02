"""Cree automatiquement un compte admin au demarrage si aucun n'existe encore.

Lit ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_FULL_NAME depuis l'environnement.
Ne fait rien si ces variables sont absentes, ou si un admin existe deja.
Concu pour tourner a chaque demarrage (idempotent) sur des plateformes
sans acces shell (ex: plan gratuit Render).
"""

import os

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole


def main() -> None:
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    full_name = os.environ.get("ADMIN_FULL_NAME", "Administrateur")

    if not email or not password:
        print("ADMIN_EMAIL/ADMIN_PASSWORD non definis, bootstrap admin ignore.")
        return

    db = SessionLocal()
    try:
        if db.query(User).filter(User.role == UserRole.ADMIN).first() is not None:
            print("Un compte admin existe deja, bootstrap ignore.")
            return
        if db.query(User).filter(User.email == email).first() is not None:
            print(f"Un utilisateur existe deja avec l'email {email}, bootstrap ignore.")
            return

        admin = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.commit()
        print(f"Compte admin cree automatiquement : {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
