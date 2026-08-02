import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    SENT_FOR_SIGNATURE = "sent_for_signature"
    SIGNED = "signed"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    template_id: Mapped[int] = mapped_column(ForeignKey("contract_templates.id"), nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Variables saisies pour la generation (prestation, montant, duree, clauses...)
    variables: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    duration_months: Mapped[int | None] = mapped_column(nullable=True)

    status: Mapped[ContractStatus] = mapped_column(
        Enum(ContractStatus), default=ContractStatus.DRAFT, nullable=False
    )

    # Chemin vers le PDF chiffre au repos (jamais l'URL brute exposee au client)
    pdf_storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)

    yousign_procedure_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
