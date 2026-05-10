from datetime import datetime

from pydantic import BaseModel


class CreateRequest(BaseModel):
    url: str
    expires_at: datetime


class CreateResponse(BaseModel):
    token: str
    short_url: str
    qr_code_url: str
    original_url: str


class UpdateRequest(BaseModel):
    url: str
    expires_at: datetime


class QRInfoResponse(BaseModel):
    token: str
    original_url: str
    created_at: datetime
    updated_at: datetime
    expired_at: datetime
    is_deleted: bool
