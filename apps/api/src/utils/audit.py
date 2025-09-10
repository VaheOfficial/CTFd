from typing import Any, Dict, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from ..models.audit import AuditLog


def log_audit(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    actor_user_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
    commit: bool = False,
) -> None:
    """Create an audit log record.

    - Keeps details minimal and structured.
    - If request provided, capture client IP in details under 'ip'.
    - Does not commit by default; caller controls transaction.
    """

    details_json: Dict[str, Any] = details.copy() if details else {}

    # Best-effort IP capture
    if request is not None:
        try:
            client_ip = request.client.host if request.client else None
            if client_ip:
                details_json.setdefault("ip", client_ip)
        except Exception:
            pass

    audit = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details_json=details_json,
    )

    db.add(audit)
    if commit:
        db.commit()


