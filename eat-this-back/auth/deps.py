import os

from fastapi import Header, HTTPException

APP_MODE = os.environ.get("APP_MODE", "open").lower()
HOSTED = APP_MODE == "hosted"


def _user_from_header(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    from auth.supabase import verify_token

    return verify_token(authorization.removeprefix("Bearer "))


def require_user(authorization: str | None = Header(default=None)):
    user = _user_from_header(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in.")
    return user


def optional_user(authorization: str | None = Header(default=None)):
    if not HOSTED:
        return None
    return _user_from_header(authorization)


def charge_credits(user, cost: int) -> None:
    """Charge a user for a paid operation. No-op in open (self-hosted) mode."""
    if not HOSTED:
        return
    if user is None:
        raise HTTPException(status_code=401, detail="Please log in to generate recipes.")
    from auth.supabase import spend_credits

    if not spend_credits(user["id"], cost):
        raise HTTPException(status_code=402, detail="Not enough credits.")
