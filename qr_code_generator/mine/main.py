from fastapi import FastAPI

from app import models  # noqa: F401  trigger model registration
from app.database import Base, engine
from app.routes import router

Base.metadata.create_all(engine)

app = FastAPI(title="QR Code Generator")
app.include_router(router)
