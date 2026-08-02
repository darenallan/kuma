from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.client import Client
from app.models.contract import Contract, ContractStatus
from app.models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    total_contracts = db.query(func.count(Contract.id)).scalar() or 0
    total_clients = db.query(func.count(Client.id)).scalar() or 0

    # Contracts by status
    status_counts = (
        db.query(Contract.status, func.count(Contract.id))
        .group_by(Contract.status)
        .all()
    )
    contracts_by_status = {s.value: c for s, c in status_counts}

    # Contracts created this month
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    contracts_this_month = (
        db.query(func.count(Contract.id))
        .filter(Contract.created_at >= first_of_month)
        .scalar()
    ) or 0

    return {
        "total_contracts": total_contracts,
        "total_clients": total_clients,
        "contracts_by_status": contracts_by_status,
        "contracts_this_month": contracts_this_month,
    }
