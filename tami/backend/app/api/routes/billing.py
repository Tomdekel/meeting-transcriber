"""Billing and subscription endpoints."""

from fastapi import APIRouter, HTTPException, Request, status, Query
from pydantic import BaseModel
from typing import Optional
from loguru import logger

from app.services.billing import billing_service, UsageLimitError


router = APIRouter()


# Schemas
class SubscriptionStatusResponse(BaseModel):
    """Subscription status response."""
    status: str
    minutesUsed: float
    minutesLimit: float
    sessionCount: int
    sessionLimit: Optional[int]
    usageResetAt: Optional[str]
    stripeCustomerId: Optional[str] = None
    subscriptionId: Optional[str] = None


class CheckoutRequest(BaseModel):
    """Request to create checkout session."""
    successUrl: str
    cancelUrl: str


class CheckoutResponse(BaseModel):
    """Checkout session response."""
    url: Optional[str]
    message: Optional[str] = None


class PortalRequest(BaseModel):
    """Request to create portal session."""
    returnUrl: str


class PortalResponse(BaseModel):
    """Portal session response."""
    url: Optional[str]
    message: Optional[str] = None


class UsageLimitCheckResponse(BaseModel):
    """Usage limit check response."""
    canProceed: bool
    errorMessage: Optional[str] = None


@router.get("/billing/status", response_model=SubscriptionStatusResponse)
async def get_billing_status(
    user_id: str = Query(..., description="User ID")
):
    """Get user's billing status and usage.

    Args:
        user_id: User ID

    Returns:
        Subscription status and usage information
    """
    try:
        status_data = await billing_service.get_user_subscription_status(user_id)
        return SubscriptionStatusResponse(**status_data)
    except Exception as e:
        logger.error(f"Failed to get billing status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get billing status: {str(e)}"
        )


@router.get("/billing/check-limits", response_model=UsageLimitCheckResponse)
async def check_usage_limits(
    user_id: str = Query(..., description="User ID")
):
    """Check if user can create a new session.

    Args:
        user_id: User ID

    Returns:
        Whether user can proceed and any error message
    """
    try:
        can_proceed, error_message = await billing_service.check_usage_limits(user_id)
        return UsageLimitCheckResponse(
            canProceed=can_proceed,
            errorMessage=error_message
        )
    except Exception as e:
        logger.error(f"Failed to check usage limits: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check usage limits: {str(e)}"
        )


@router.post("/billing/create-checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    user_id: str = Query(..., description="User ID")
):
    """Create a Stripe checkout session for Pro upgrade.

    Args:
        request: Checkout request with URLs
        user_id: User ID

    Returns:
        Checkout session URL
    """
    try:
        checkout_url = await billing_service.create_checkout_session(
            user_id=user_id,
            success_url=request.successUrl,
            cancel_url=request.cancelUrl
        )

        if checkout_url:
            return CheckoutResponse(url=checkout_url)
        else:
            return CheckoutResponse(
                url=None,
                message="Stripe not configured. Please contact support."
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.post("/billing/portal", response_model=PortalResponse)
async def create_portal_session(
    request: PortalRequest,
    user_id: str = Query(..., description="User ID")
):
    """Create a Stripe customer portal session.

    Args:
        request: Portal request with return URL
        user_id: User ID

    Returns:
        Portal session URL
    """
    try:
        portal_url = await billing_service.create_portal_session(
            user_id=user_id,
            return_url=request.returnUrl
        )

        if portal_url:
            return PortalResponse(url=portal_url)
        else:
            return PortalResponse(
                url=None,
                message="No active subscription found or Stripe not configured."
            )
    except Exception as e:
        logger.error(f"Failed to create portal session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create portal session: {str(e)}"
        )


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events.

    Args:
        request: Raw request with webhook payload

    Returns:
        Processing result
    """
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature", "")

        result = await billing_service.handle_webhook(payload, sig_header)

        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("reason", "Webhook processing failed")
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )
