import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import supabase
from auth.deps import require_user

router = APIRouter(prefix="/auth")


@router.get("/me")
def me(user=Depends(require_user)):
    credits = supabase.get_credits(user["id"])
    if credits is None:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return {"email": user["email"], "credits": credits}


class TopUpSchema(BaseModel):
    amount: int


@router.post("/credits/add")
def credits_add(body: TopUpSchema, user=Depends(require_user)):
    """Development stub for purchasing credits.

    In production, replace with a payment-provider flow (e.g. Stripe Checkout
    + webhook) that calls supabase.add_credits() only after a verified payment
    event. Enabled only when ALLOW_DEV_TOPUP=true.
    """
    if os.environ.get("ALLOW_DEV_TOPUP", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Credit purchases are not enabled on this server.")
    if not 1 <= body.amount <= 1000:
        raise HTTPException(status_code=400, detail="Amount must be between 1 and 1000.")
    credits = supabase.add_credits(user["id"], body.amount)
    if credits is None:
        raise HTTPException(status_code=502, detail="Failed to update credits.")
    return {"credits": credits}
