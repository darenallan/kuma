"""Cree automatiquement un compte admin au demarrage si aucun n'existe encore.

Lit ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_FULL_NAME depuis l'environnement.
Ne fait rien si ces variables sont absentes, ou si un admin existe deja
- sauf si ADMIN_FORCE_RESET=true, auquel cas le mot de passe de l'utilisateur
ADMIN_EMAIL est reinitialise a ADMIN_PASSWORD (utile pour se recuperer sans
acces shell, ex: plan gratuit Render). Pense a repasser ADMIN_FORCE_RESET a
false apres coup pour eviter un reset a chaque redeploiement.
"""

import os

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole


def main() -> None:
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    full_name = os.environ.get("ADMIN_FULL_NAME", "Administrateur")
    force_reset = os.environ.get("ADMIN_FORCE_RESET", "").lower() in ("1", "true", "yes")

    if not email or not password:
        print("ADMIN_EMAIL/ADMIN_PASSWORD non definis, bootstrap admin ignore.")
        return

    db = SessionLocal()
    try:
        existing_by_email = db.query(User).filter(User.email == email).first()

        if force_reset and existing_by_email is not None:
            existing_by_email.hashed_password = hash_password(password)
            existing_by_email.role = UserRole.ADMIN
            existing_by_email.is_active = True
            db.commit()
            print(f"Mot de passe reinitialise pour : {email}")
            return

        if db.query(User).filter(User.role == UserRole.ADMIN).first() is not None:
            print("Un compte admin existe deja, bootstrap ignore.")
            return
        if existing_by_email is not None:
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
