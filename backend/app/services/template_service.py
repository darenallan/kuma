"""Construction du contexte de rendu des modèles de contrat."""

from datetime import datetime, timezone
from decimal import Decimal

from app.models.client import Client
from app.models.contract import Contract
from app.models.template import ContractTemplate


def format_amount(amount: Decimal | int | float) -> str:
    """Montant en FCFA, séparateur d'espace (convention francophone)."""
    return f"{Decimal(amount):,.0f}".replace(",", " ") + " FCFA"


def format_duration(months: int | None) -> str | None:
    if not months:
        return None
    return f"{months} mois"


def build_context(contract: Contract, client: Client, template: ContractTemplate) -> dict:
    """Variables système, toujours disponibles quel que soit le modèle."""
    variables = contract.variables or {}
    return {
        "title": template.name,
        "reference": contract.reference,
        "date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "montant": format_amount(contract.amount),
        "duree": format_duration(contract.duration_months),
        "client": client,
        "prestataire_nom": variables.get("prestataire_nom") or "Le Prestataire",
    }


def build_values(contract: Contract, client: Client) -> dict:
    """Valeurs substituables dans le texte des articles.

    Réunit les variables saisies par l'utilisateur et les variables système
    (préfixées `client_`, plus `reference`, `montant`, `duree`, `date`).
    """
    values = dict(contract.variables or {})
    values.update(
        {
            "reference": contract.reference,
            "date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
            "montant": format_amount(contract.amount),
            "duree": format_duration(contract.duration_months) or "",
            "client_entreprise": client.company_name,
            "client_contact": client.contact_name,
            "client_email": client.email,
            "client_adresse": client.address or "",
            "client_telephone": client.phone or "",
        }
    )
    return values


def build_preview_data(template_name: str, variables_schema: list) -> tuple[dict, dict]:
    """Jeu de données fictives pour prévisualiser un modèle non enregistré."""
    context = {
        "title": template_name,
        "reference": "CTR-2026-APERCU",
        "date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "montant": format_amount(1_500_000),
        "duree": "3 mois",
        "client": type(
            "PreviewClient",
            (),
            {
                "company_name": "Entreprise Exemple SARL",
                "contact_name": "Awa Diallo",
                "address": "Cocody, Abidjan",
                "email": "contact@exemple.com",
            },
        )(),
        "prestataire_nom": "Votre entreprise",
    }

    values = {
        "reference": context["reference"],
        "date": context["date"],
        "montant": context["montant"],
        "duree": context["duree"],
        "client_entreprise": "Entreprise Exemple SARL",
        "client_contact": "Awa Diallo",
        "client_email": "contact@exemple.com",
        "client_adresse": "Cocody, Abidjan",
        "client_telephone": "+225 07 00 00 00",
    }
    # Valeur d'exemple lisible pour chaque variable déclarée du modèle.
    for variable in variables_schema or []:
        key = variable.get("key") if isinstance(variable, dict) else variable.key
        label = variable.get("label") if isinstance(variable, dict) else variable.label
        vtype = variable.get("type") if isinstance(variable, dict) else variable.type
        if vtype == "number":
            values[key] = "10"
        elif vtype == "date":
            values[key] = "01/01/2026"
        else:
            values[key] = f"‹{label}›"

    return context, values
