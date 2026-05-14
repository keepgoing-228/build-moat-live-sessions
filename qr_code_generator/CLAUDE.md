# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This directory holds an implementation of the QR-code shortener spec in `PROMPT.md` (the spec originated as a live-session teaching exercise — `README.md` still describes that framing). The project is split into:

- `backend/` — FastAPI + SQLAlchemy + SQLite, the running implementation
- `frontend/` — planned, not yet started

When asked to "implement" something, work inside the relevant tier and don't introduce cross-tier coupling unless explicitly asked.

## Run and Verify (backend)

```bash
cd backend
uv sync
uv run fastapi dev --host 0.0.0.0 --port 8080
```

There is **no test suite**. Verification is the curl block at the bottom of `PROMPT.md` (create, redirect 302, GET info, PATCH update, redirect to new target, soft-delete → 410, missing token → 404, PNG image, analytics). Run those curls against a live server to confirm behavior.

The SQLite file (`backend/qr_code.db`) is auto-created from `Base.metadata.create_all()` in `app/main.py` on startup. To reset state, stop the server and delete the file.

## Architecture Notes That Span Files (backend)

- **Cache-first redirect path.** `redirect_cache` is a module-level `dict` in `routes.py` simulating Redis. Every mutation that affects redirect target — successful `create_qr` (warm), `update_qr` when `url` *or* `expires_at` changes (invalidate), `delete_qr` (invalidate) — must keep the cache consistent. `redirect()` itself warms the cache on a DB hit. If you add a new mutation path, you own its cache invalidation.
- **Soft delete, not hard delete.** `is_deleted=True` on `UrlMapping` + the row stays. `_get_mapping_or_404` treats soft-deleted rows as 404 for the *admin* API (`GET/PATCH/DELETE /api/qr/{token}`), but the *redirect* path must distinguish them and return **410 Gone** instead of 404. Don't reuse `_get_mapping_or_404` inside `redirect()`.
- **`ScanEvent` is append-only analytics**, written by `_record_scan` from the redirect handler. Indexed by `(token, scanned_at)` for the daily-aggregation query in `get_analytics`.
- **`BASE_URL`** is hardcoded to `http://localhost:8000` in `routes.py`. The QR PNG encodes `{BASE_URL}/r/{token}`, so changing the host means regenerating images. When the frontend ships, this likely needs to move to config.

## Conventions

- Python ≥ 3.12 (`requires-python` in `backend/pyproject.toml`); uses PEP 604 unions (`str | None`, `datetime | None`).
- SQLAlchemy 2.0 typed `Mapped[...]` style — match it when adding columns.
- Pydantic v2 (`BaseModel` from `pydantic`) for request/response schemas in `schemas.py`.
- Dependency management via `uv` (`pyproject.toml` + `uv.lock`); do not introduce `requirements.txt`.
