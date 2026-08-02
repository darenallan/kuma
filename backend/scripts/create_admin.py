"""Cree le premier compte administrateur (bootstrap, /api/auth/register exige deja un admin).

Usage: python -m scripts.create_admin <email> <mot_de_passe> <nom_complet>
"""

import sys

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole


def main() -> None:
    if len(sys.argv) != 4:
        print("Usage: python -m scripts.create_admin <email> <mot_de_passe> <nom_complet>")
        raise SystemExit(1)

    email, password, full_name = sys.argv[1], sys.argv[2], sys.argv[3]

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first() is not None:
            print(f"Un utilisateur existe deja avec l'email {email}")
            raise SystemExit(1)

        admin = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.commit()
        print(f"Compte admin cree : {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
