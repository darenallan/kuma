from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ContractTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    filename: str = Field(min_length=1, max_length=255)


class ContractTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    filename: str
    version: int
    is_active: bool
    created_at: datetime
