import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Clé de variable : identifiant simple, utilisable tel quel dans {{ ma_variable }}.
VARIABLE_KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,39}$")

# Variables toujours fournies par le système : un modèle ne peut pas les redéfinir,
# sinon la valeur saisie écraserait silencieusement la donnée réelle du contrat.
RESERVED_KEYS = frozenset(
    {
        "reference",
        "date",
        "montant",
        "duree",
        "client_entreprise",
        "client_contact",
        "client_email",
        "client_adresse",
        "client_telephone",
    }
)

MAX_VARIABLES = 30
MAX_ARTICLES = 40


class TemplateVariable(BaseModel):
    key: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=120)
    type: Literal["text", "textarea", "number", "date"] = "text"
    required: bool = False
    help: str | None = Field(default=None, max_length=200)

    @field_validator("key")
    @classmethod
    def validate_key(cls, v: str) -> str:
        v = v.strip().lower()
        if not VARIABLE_KEY_RE.match(v):
            raise ValueError(
                "Clé invalide : lettres minuscules, chiffres et tirets bas uniquement, "
                "en commençant par une lettre."
            )
        if v in RESERVED_KEYS:
            raise ValueError(f"« {v} » est une variable réservée fournie automatiquement.")
        return v


class TemplateArticle(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=8000)


class TemplateBody(BaseModel):
    intro: str | None = Field(default=None, max_length=4000)
    articles: list[TemplateArticle] = Field(default_factory=list, max_length=MAX_ARTICLES)


class ContractTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    body: TemplateBody
    variables_schema: list[TemplateVariable] = Field(default_factory=list, max_length=MAX_VARIABLES)

    @field_validator("variables_schema")
    @classmethod
    def unique_keys(cls, v: list[TemplateVariable]) -> list[TemplateVariable]:
        keys = [item.key for item in v]
        duplicates = {k for k in keys if keys.count(k) > 1}
        if duplicates:
            raise ValueError(f"Clés de variable en double : {', '.join(sorted(duplicates))}")
        return v

    @model_validator(mode="after")
    def check_placeholders_declared(self):
        """Refuse un modèle qui référence une variable non déclarée.

        Sans ce garde-fou, la faute de frappe ne se voit qu'au moment de générer
        le PDF, avec un trou dans le contrat envoyé au client.
        """
        declared = {item.key for item in self.variables_schema} | RESERVED_KEYS
        texts = [a.content for a in self.body.articles] + [a.title for a in self.body.articles]
        if self.body.intro:
            texts.append(self.body.intro)

        used = set()
        for text in texts:
            used.update(re.findall(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}", text))

        unknown = sorted(used - declared)
        if unknown:
            raise ValueError(
                "Variables utilisées mais non déclarées : " + ", ".join(unknown)
            )
        return self


class ContractTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    body: TemplateBody | None = None
    variables_schema: list[TemplateVariable] | None = Field(default=None, max_length=MAX_VARIABLES)
    is_active: bool | None = None


class ContractTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    filename: str | None
    is_builtin: bool
    body: dict | None
    variables_schema: list
    version: int
    is_active: bool
    created_at: datetime


class TemplatePreviewRequest(BaseModel):
    """Rendu d'essai : le modèle n'a pas besoin d'être enregistré."""

    name: str = Field(min_length=1, max_length=255)
    body: TemplateBody
    variables_schema: list[TemplateVariable] = Field(default_factory=list, max_length=MAX_VARIABLES)
