# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **teaching exercise** for a live session, not a production project. `PROMPT.md` is the spec and `README.md` describes two tracks:

- **Challenge Track** — student builds from scratch using `PROMPT.md`. No code is provided.
- **Guided Track** — student fills in `TODO`s inside `scaffold/`. The boilerplate (FastAPI app wiring, SQLAlchemy models, schemas, all routes except `redirect`) is already written.

When asked to "implement" something here, the user is almost always doing the Guided Track. Do not refactor the surrounding scaffold — only fill in the marked TODOs unless the user explicitly asks otherwise.

## The Three TODOs (Guided Track)

These are the only functions students are meant to write. Each has design hints inline; respect them:

| File | Function | Purpose |
|------|----------|---------|
| `scaffold/app/token_gen.py` | `generate_token()` | SHA-256 + nonce + Base62, retry on collision via `token_exists_in_db()`, give up after `MAX_RETRIES` |
| `scaffold/app/url_validator.py` | `validate_url()` | Length + http(s) scheme + blocklist check; normalize (lowercase, strip trailing slash, upgrade http→https); raise `ValueError` on invalid input |
| `scaffold/app/routes.py` | `redirect()` | Cache → DB → 404/410. On hit: `_record_scan()` + 302. On miss: load from DB, return 404 if missing, 410 if `is_deleted` or past `expires_at`, otherwise warm cache and 302 |

`validate_url` raises `ValueError`; the create/update routes already catch it and translate to HTTP 422 — keep that contract.

## Run and Verify

```bash
cd scaffold
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

There is **no test suite**. Verification is the curl block at the bottom of `PROMPT.md` (covers create, redirect 302, get info, PATCH update, redirect to new target, soft-delete → 410, missing token → 404, PNG image, analytics). Run those curls against a live server to confirm an implementation is correct.

The SQLite file (`scaffold/qr_code.db`) is auto-created from `Base.metadata.create_all()` in `app/main.py` on startup. To reset state, stop the server and delete the file.

## Architecture Notes That Span Files

- **Cache-first redirect path.** `redirect_cache` is a module-level `dict` in `routes.py` simulating Redis. Every mutation that affects redirect target — successful `create_qr` (warm), `update_qr` when `url` *or* `expires_at` changes (invalidate), `delete_qr` (invalidate) — must keep the cache consistent. `redirect()` itself warms the cache on a DB hit. If you add a new mutation path, you own its cache invalidation.
- **Soft delete, not hard delete.** `is_deleted=True` on `UrlMapping` + the row stays. `_get_mapping_or_404` treats soft-deleted rows as 404 for the *admin* API (`GET/PATCH/DELETE /api/qr/{token}`), but the *redirect* path must distinguish them and return **410 Gone** instead of 404. Don't reuse `_get_mapping_or_404` inside `redirect()`.
- **`ScanEvent` is append-only analytics**, written by `_record_scan` from the redirect handler. Indexed by `(token, scanned_at)` for the daily-aggregation query in `get_analytics`.
- **`BASE_URL`** is hardcoded to `http://localhost:8000` in `routes.py`. The QR PNG encodes `{BASE_URL}/r/{token}`, so changing the host means regenerating images.

## Conventions

- Python 3.10+ is required (the codebase uses `str | None` PEP 604 unions and `datetime | None`).
- SQLAlchemy 2.0 typed `Mapped[...]` style — match it when adding columns.
- Pydantic v2 (`BaseModel` from `pydantic`) for request/response schemas in `schemas.py`.
