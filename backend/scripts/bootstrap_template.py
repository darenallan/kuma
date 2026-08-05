"""Crée les modèles de contrat de départ si la base n'en contient aucun.

Idempotent : ne fait rien si un modèle existe déjà. Évite un cul-de-sac
dans l'assistant de création de contrat pour un utilisateur qui découvre
l'application.
"""

from app.core.database import SessionLocal
from app.models.template import ContractTemplate

# Modèle d'exemple composé d'articles : sert de point de départ concret,
# duplicable et modifiable depuis l'interface.
PRESTATION_VARIABLES = [
    {"key": "prestataire_nom", "label": "Nom du prestataire", "type": "text", "required": True,
     "help": "Votre nom ou raison sociale."},
    {"key": "prestation", "label": "Objet de la prestation", "type": "textarea", "required": True,
     "help": "Décrivez la prestation en quelques lignes."},
    {"key": "livrables", "label": "Livrables attendus", "type": "textarea", "required": False},
    {"key": "acompte", "label": "Acompte à la signature", "type": "text", "required": False,
     "help": "Par exemple : 50 % du montant total."},
    {"key": "clauses_specifiques", "label": "Clauses spécifiques", "type": "textarea", "required": False},
]

PRESTATION_BODY = {
    "intro": (
        "Entre {{ prestataire_nom }}, ci-après dénommé « le Prestataire »,\n"
        "et {{ client_entreprise }}, représenté(e) par {{ client_contact }}, "
        "ci-après dénommé « le Client ».\n"
        "Les parties conviennent de ce qui suit."
    ),
    "articles": [
        {
            "title": "Objet du contrat",
            "content": (
                "Le présent contrat a pour objet la réalisation de la prestation suivante :\n"
                "{{ prestation }}"
            ),
        },
        {
            "title": "Livrables",
            "content": "Le Prestataire s'engage à fournir au Client :\n{{ livrables }}",
        },
        {
            "title": "Durée",
            "content": (
                "La prestation est réalisée sur une durée de {{ duree }} à compter "
                "de la signature du présent contrat."
            ),
        },
        {
            "title": "Prix et modalités de paiement",
            "content": (
                "Le montant total de la prestation s'élève à {{ montant }}.\n"
                "Acompte à la signature : {{ acompte }}.\n"
                "Le solde est exigible à la livraison finale. Aucun livrable en qualité "
                "définitive n'est remis avant paiement intégral, sauf accord écrit."
            ),
        },
        {
            "title": "Obligations du Prestataire",
            "content": (
                "Le Prestataire s'engage à exécuter la prestation avec professionnalisme "
                "et diligence, à respecter les délais convenus, et à informer le Client de "
                "toute difficulté pouvant affecter la livraison."
            ),
        },
        {
            "title": "Obligations du Client",
            "content": (
                "Le Client s'engage à fournir dans les délais tous les éléments nécessaires "
                "à la prestation, à effectuer des retours clairs et groupés, et à respecter "
                "les modalités de paiement. Il garantit détenir les droits sur les éléments "
                "qu'il transmet."
            ),
        },
        {
            "title": "Propriété intellectuelle",
            "content": (
                "Les droits d'exploitation sur les livrables finaux sont transférés au Client "
                "après paiement intégral. Le Prestataire conserve ses méthodes et fichiers de "
                "travail, ainsi que le droit d'utiliser des extraits du projet à des fins de "
                "portfolio, sauf refus écrit du Client."
            ),
        },
        {
            "title": "Confidentialité",
            "content": (
                "Les parties s'engagent à garder confidentielles les informations et données "
                "échangées, sauf obligation légale ou accord écrit."
            ),
        },
        {
            "title": "Résiliation",
            "content": (
                "En cas d'annulation après démarrage, les heures déjà travaillées restent dues "
                "et l'acompte n'est pas remboursable, sauf accord contraire entre les parties."
            ),
        },
        {
            "title": "Clauses particulières",
            "content": "{{ clauses_specifiques }}",
        },
    ],
}


def main() -> None:
    db = SessionLocal()
    try:
        if db.query(ContractTemplate).first() is not None:
            print("Un modèle existe déjà, bootstrap ignoré.")
            return

        db.add(
            ContractTemplate(
                name="Prestation de service",
                description="Contrat de prestation générique, prêt à être dupliqué et adapté.",
                body=PRESTATION_BODY,
                variables_schema=PRESTATION_VARIABLES,
                is_builtin=False,
                version=1,
                is_active=True,
            )
        )
        db.commit()
        print("Modèle de départ créé : Prestation de service")
    finally:
        db.close()


if __name__ == "__main__":
    main()
