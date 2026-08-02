"""Cree un template de contrat par defaut au demarrage si aucun n'existe.

Idempotent : ne fait rien si un template existe deja. Evite un cul-de-sac
dans l'assistant de creation de contrat pour un client qui teste l'app
sans avoir de moyen, dans l'interface, de creer un template lui-meme.
"""

from app.core.database import SessionLocal
from app.models.template import ContractTemplate


def main() -> None:
    db = SessionLocal()
    try:
        if db.query(ContractTemplate).first() is not None:
            print("Un template existe deja, bootstrap ignore.")
            return

        template = ContractTemplate(
            name="Prestation de service",
            description="Contrat de prestation de service generique (montant, duree, clauses specifiques).",
            filename="prestation_service.html",
            version=1,
            is_active=True,
        )
        db.add(template)
        db.commit()
        print("Template par defaut cree : prestation_service.html")
    finally:
        db.close()


if __name__ == "__main__":
    main()
