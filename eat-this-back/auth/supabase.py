"""Supabase integration: JWT verification and the credits ledger.

Login/signup happen client-side via supabase-js. The backend only
(1) verifies the Supabase access token and (2) reads/updates the credits
balance in the `profiles` table (see supabase/schema.sql) using the
service-role key, which never leaves the server.
"""
import os
from functools import lru_cache

import httpx
import jwt

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")


@lru_cache(maxsize=1)
def _jwks_client():
    return jwt.PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")


def verify_token(token: str) -> dict | None:
    """Return {'id': <uuid>, 'email': ...} for a valid Supabase access token."""
    try:
        if JWT_SECRET:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        else:
            key = _jwks_client().get_signing_key_from_jwt(token).key
            payload = jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated")
        return {"id": payload["sub"], "email": payload.get("email", "")}
    except (jwt.InvalidTokenError, KeyError, httpx.HTTPError, Exception):
        return None


def _rest(method: str, path: str, **kwargs):
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    return httpx.request(method, f"{SUPABASE_URL}/rest/v1{path}", headers=headers, timeout=10, **kwargs)


def get_credits(user_id: str) -> int | None:
    resp = _rest("GET", f"/profiles?id=eq.{user_id}&select=credits")
    rows = resp.json() if resp.status_code == 200 else []
    return rows[0]["credits"] if rows else None


def spend_credits(user_id: str, amount: int) -> bool:
    """Atomic conditional decrement via the spend_credits SQL function."""
    resp = _rest("POST", "/rpc/spend_credits", json={"p_user": user_id, "p_amount": amount})
    return resp.status_code == 200 and resp.json() is True


def add_credits(user_id: str, amount: int) -> int | None:
    resp = _rest("POST", "/rpc/add_credits", json={"p_user": user_id, "p_amount": amount})
    return resp.json() if resp.status_code == 200 else None
