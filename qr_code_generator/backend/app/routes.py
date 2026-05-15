import io
from datetime import datetime, timezone

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import ScanEvent, UrlMapping
from .schemas import (
    CreateRequest,
    CreateResponse,
    QRInfoResponse,
    QRListResponse,
    UpdateRequest,
)
from .token_gen import generate_token
from .url_validator import validate_url

router = APIRouter()

# In-memory cache (simulates Redis for prototype)
# Each entry: {"original_url": str, "expires_at": datetime | None}
redirect_cache: dict[str, dict] = {}


def _warm_cache(mapping: UrlMapping) -> None:
    redirect_cache[mapping.token] = {
        "original_url": mapping.original_url,
        "expires_at": mapping.expires_at,
    }


def _invalidate_cache(token: str) -> None:
    redirect_cache.pop(token, None)

BASE_URL = get_settings().base_url


@router.post("/api/qr/create", response_model=CreateResponse)
def create_qr(req: CreateRequest, db: Session = Depends(get_db)):
    try:
        normalized_url = validate_url(req.url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    token = generate_token(normalized_url, db)

    mapping = UrlMapping(
        token=token,
        original_url=normalized_url,
        expires_at=req.expires_at,
    )
    db.add(mapping)
    db.commit()

    short_url = f"{BASE_URL}/r/{token}"

    _warm_cache(mapping)

    return CreateResponse(
        token=token,
        short_url=short_url,
        qr_code_url=f"{BASE_URL}/api/qr/{token}/image",
        original_url=normalized_url,
    )


@router.get("/r/{token}")
def redirect(token: str, request: Request, db: Session = Depends(get_db)):
    """Redirect fallback flow: Cache -> DB -> 404/410 (from slides mermaid diagram)"""
    now = datetime.now(timezone.utc)

    # Step 1: Cache hit?
    if token in redirect_cache:
        entry = redirect_cache[token]
        if entry["expires_at"] and entry["expires_at"] < now:
            _invalidate_cache(token)
            raise HTTPException(status_code=410, detail="Gone — this link has expired")
        _record_scan(token, request, db)
        return RedirectResponse(url=entry["original_url"], status_code=302)

    # Step 2: DB lookup
    mapping = db.execute(
        select(UrlMapping).where(UrlMapping.token == token)
    ).scalar_one_or_none()

    if mapping is None:
        raise HTTPException(status_code=404, detail="Not Found")

    if mapping.is_deleted:
        raise HTTPException(status_code=410, detail="Gone — this link has been deleted")

    if mapping.expires_at and mapping.expires_at < now:
        raise HTTPException(status_code=410, detail="Gone — this link has expired")

    _warm_cache(mapping)

    _record_scan(token, request, db)
    return RedirectResponse(url=mapping.original_url, status_code=302)


@router.get("/api/qr", response_model=QRListResponse)
def list_qr(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    total = db.execute(
        select(func.count(UrlMapping.id)).where(UrlMapping.is_deleted == False)  # noqa: E712
    ).scalar() or 0
    items = db.execute(
        select(UrlMapping)
        .where(UrlMapping.is_deleted == False)  # noqa: E712
        .order_by(UrlMapping.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/api/qr/{token}", response_model=QRInfoResponse)
def get_qr_info(token: str, db: Session = Depends(get_db)):
    mapping = _get_mapping_or_404(token, db)
    return mapping


@router.patch("/api/qr/{token}", response_model=QRInfoResponse)
def update_qr(token: str, req: UpdateRequest, db: Session = Depends(get_db)):
    mapping = _get_mapping_or_404(token, db)

    if req.url is not None:
        try:
            mapping.original_url = validate_url(req.url)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        _invalidate_cache(token)

    if req.expires_at is not None:
        mapping.expires_at = req.expires_at
        _invalidate_cache(token)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/api/qr/{token}")
def delete_qr(token: str, db: Session = Depends(get_db)):
    mapping = _get_mapping_or_404(token, db)
    mapping.is_deleted = True
    db.commit()
    _invalidate_cache(token)
    return {"detail": "Deleted"}


@router.get("/api/qr/{token}/image")
def get_qr_image(token: str, db: Session = Depends(get_db)):
    _get_mapping_or_404(token, db)
    short_url = f"{BASE_URL}/r/{token}"

    img = qrcode.make(short_url)
    buf = io.BytesIO()
    img.save(buf, kind="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@router.get("/api/qr/{token}/analytics")
def get_analytics(token: str, db: Session = Depends(get_db)):
    _get_mapping_or_404(token, db)

    total = db.execute(
        select(func.count(ScanEvent.id)).where(ScanEvent.token == token)
    ).scalar()

    daily = db.execute(
        select(
            func.date(ScanEvent.scanned_at).label("date"),
            func.count(ScanEvent.id).label("count"),
        )
        .where(ScanEvent.token == token)
        .group_by(func.date(ScanEvent.scanned_at))
    ).all()

    return {
        "token": token,
        "total_scans": total,
        "scans_by_day": [{"date": str(row.date), "count": row.count} for row in daily],
    }


def _get_mapping_or_404(token: str, db: Session) -> UrlMapping:
    mapping = db.execute(
        select(UrlMapping).where(UrlMapping.token == token)
    ).scalar_one_or_none()
    if mapping is None or mapping.is_deleted:
        raise HTTPException(status_code=404, detail="Not Found")
    return mapping


def _record_scan(token: str, request: Request, db: Session):
    event = ScanEvent(
        token=token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    db.add(event)
    db.commit()
