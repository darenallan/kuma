from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ContractTemplate(Base):
    """Modèle de contrat.

    Deux origines possibles :
    - `filename` renseigné → template Jinja2 livré avec l'application (built-in),
      non modifiable depuis l'interface.
    - `body` renseigné → modèle composé par l'utilisateur (articles structurés).
      Le contenu n'est JAMAIS compilé comme template Jinja2 : les variables sont
      substituées par expression régulière puis échappées au rendu, ce qui ferme
      la porte à l'injection de template côté serveur (SSTI).
    """

    __tablename__ = "contract_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Template fourni avec l'app (mutuellement exclusif avec `body`).
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Modèle composé par l'utilisateur : {"intro": str, "articles": [{"title", "content"}]}
    body: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # [{"key", "label", "type", "required", "help"}]
    variables_schema: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
