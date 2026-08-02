from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.contract import ContractStatus


class ContractCreate(BaseModel):
    client_id: int
    template_id: int
    variables: dict = Field(default_factory=dict)
    amount: Decimal = Field(gt=0)
    duration_months: int | None = Field(default=None, gt=0)


class ContractRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    client_id: int
    template_id: int
    created_by_id: int
    variables: dict
    amount: Decimal
    duration_months: int | None
    status: ContractStatus
    yousign_procedure_id: str | None
    signed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ContractSendForSignature(BaseModel):
    signer_email: str
    signer_name: str
