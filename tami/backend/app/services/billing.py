"""Billing service with Stripe integration."""

from datetime import datetime, timedelta
from typing import Optional, Tuple
from loguru import logger

try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    stripe = None

from app.db import db
from app.core.config import settings


# Usage limits
FREE_TIER_MONTHLY_MINUTES = 180  # 3 hours
FREE_TIER_MAX_SESSIONS = 10
PRO_TIER_MONTHLY_MINUTES = float('inf')  # Unlimited

# Feature flag - set to True when ready to enforce billing
BILLING_ENABLED = False


class UsageLimitError(Exception):
    """Raised when usage limit is exceeded."""
    pass


class BillingService:
    """Service for managing billing and usage tracking."""

    def __init__(self):
        """Initialize billing service."""
        if STRIPE_AVAILABLE and hasattr(settings, 'STRIPE_SECRET_KEY') and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            self.stripe_enabled = True
        else:
            self.stripe_enabled = False
            logger.warning("Stripe not configured - billing features disabled")

    async def get_user_subscription_status(self, user_id: str) -> dict:
        """Get user's subscription status and usage.

        Args:
            user_id: User ID

        Returns:
            Dict with subscription info and usage
        """
        user = await db.user.find_unique(where={"id": user_id})

        if not user:
            return {
                "status": "free",
                "minutesUsed": 0,
                "minutesLimit": FREE_TIER_MONTHLY_MINUTES,
                "sessionCount": 0,
                "sessionLimit": FREE_TIER_MAX_SESSIONS,
                "usageResetAt": datetime.utcnow().isoformat()
            }

        # Check if we need to reset monthly usage
        if user.usageResetAt:
            reset_date = user.usageResetAt
            if datetime.utcnow() - reset_date > timedelta(days=30):
                # Reset monthly usage
                await db.user.update(
                    where={"id": user_id},
                    data={
                        "monthlyMinutesUsed": 0,
                        "monthlySessionCount": 0,
                        "usageResetAt": datetime.utcnow()
                    }
                )
                user = await db.user.find_unique(where={"id": user_id})

        is_pro = user.subscriptionStatus == "pro"

        return {
            "status": user.subscriptionStatus,
            "minutesUsed": user.monthlyMinutesUsed,
            "minutesLimit": PRO_TIER_MONTHLY_MINUTES if is_pro else FREE_TIER_MONTHLY_MINUTES,
            "sessionCount": user.monthlySessionCount,
            "sessionLimit": None if is_pro else FREE_TIER_MAX_SESSIONS,
            "usageResetAt": user.usageResetAt.isoformat() if user.usageResetAt else None,
            "stripeCustomerId": user.stripeCustomerId,
            "subscriptionId": user.subscriptionId
        }

    async def check_usage_limits(self, user_id: str) -> Tuple[bool, Optional[str]]:
        """Check if user can create a new session.

        Args:
            user_id: User ID

        Returns:
            Tuple of (can_proceed, error_message)
        """
        # Billing disabled for early users - everyone gets unlimited access
        if not BILLING_ENABLED:
            return True, None

        status = await self.get_user_subscription_status(user_id)

        # Pro users have no limits
        if status["status"] == "pro":
            return True, None

        # Check session limit
        if status["sessionLimit"] and status["sessionCount"] >= status["sessionLimit"]:
            return False, f"Session limit reached ({status['sessionLimit']} sessions/month). Upgrade to Pro for unlimited sessions."

        # Check minutes limit
        if status["minutesUsed"] >= status["minutesLimit"]:
            return False, f"Usage limit reached ({status['minutesLimit']} minutes/month). Upgrade to Pro for unlimited usage."

        return True, None

    async def record_usage(
        self,
        user_id: str,
        session_id: str,
        duration_minutes: float
    ) -> dict:
        """Record usage for a transcription.

        Args:
            user_id: User ID
            session_id: Session ID
            duration_minutes: Duration in minutes

        Returns:
            Updated usage info
        """
        # Get current user
        user = await db.user.find_unique(where={"id": user_id})

        if not user:
            logger.error(f"User not found for usage recording: {user_id}")
            return {}

        # Create usage log
        await db.usagelog.create(
            data={
                "userId": user_id,
                "sessionId": session_id,
                "minutes": duration_minutes
            }
        )

        # Update user's monthly usage
        await db.user.update(
            where={"id": user_id},
            data={
                "monthlyMinutesUsed": user.monthlyMinutesUsed + duration_minutes,
                "monthlySessionCount": user.monthlySessionCount + 1
            }
        )

        logger.info(f"Recorded usage for user {user_id}: {duration_minutes} minutes")

        return await self.get_user_subscription_status(user_id)

    async def create_checkout_session(
        self,
        user_id: str,
        success_url: str,
        cancel_url: str
    ) -> Optional[str]:
        """Create a Stripe checkout session for Pro upgrade.

        Args:
            user_id: User ID
            success_url: URL to redirect on success
            cancel_url: URL to redirect on cancel

        Returns:
            Checkout session URL or None if Stripe not configured
        """
        if not self.stripe_enabled:
            logger.warning("Stripe not enabled - cannot create checkout session")
            return None

        user = await db.user.find_unique(where={"id": user_id})

        if not user:
            raise ValueError("User not found")

        # Get or create Stripe customer
        if user.stripeCustomerId:
            customer_id = user.stripeCustomerId
        else:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"user_id": user_id}
            )
            customer_id = customer.id

            # Save customer ID
            await db.user.update(
                where={"id": user_id},
                data={"stripeCustomerId": customer_id}
            )

        # Get price ID from settings
        price_id = getattr(settings, 'STRIPE_PRO_PRICE_ID', None)
        if not price_id:
            raise ValueError("Stripe Pro price ID not configured")

        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user_id}
        )

        return checkout_session.url

    async def create_portal_session(self, user_id: str, return_url: str) -> Optional[str]:
        """Create a Stripe customer portal session.

        Args:
            user_id: User ID
            return_url: URL to return to after portal

        Returns:
            Portal session URL or None if not available
        """
        if not self.stripe_enabled:
            return None

        user = await db.user.find_unique(where={"id": user_id})

        if not user or not user.stripeCustomerId:
            return None

        portal_session = stripe.billing_portal.Session.create(
            customer=user.stripeCustomerId,
            return_url=return_url
        )

        return portal_session.url

    async def handle_webhook(self, payload: bytes, sig_header: str) -> dict:
        """Handle Stripe webhook events.

        Args:
            payload: Raw webhook payload
            sig_header: Stripe signature header

        Returns:
            Processing result
        """
        if not self.stripe_enabled:
            return {"status": "skipped", "reason": "Stripe not enabled"}

        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)
        if not webhook_secret:
            return {"status": "error", "reason": "Webhook secret not configured"}

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError:
            return {"status": "error", "reason": "Invalid payload"}
        except stripe.error.SignatureVerificationError:
            return {"status": "error", "reason": "Invalid signature"}

        # Handle subscription events
        if event.type == "checkout.session.completed":
            session = event.data.object
            user_id = session.metadata.get("user_id")

            if user_id:
                await db.user.update(
                    where={"id": user_id},
                    data={
                        "subscriptionId": session.subscription,
                        "subscriptionStatus": "pro"
                    }
                )
                logger.info(f"User {user_id} upgraded to Pro")

        elif event.type == "customer.subscription.deleted":
            subscription = event.data.object
            customer_id = subscription.customer

            # Find user by customer ID
            user = await db.user.find_first(
                where={"stripeCustomerId": customer_id}
            )

            if user:
                await db.user.update(
                    where={"id": user.id},
                    data={
                        "subscriptionStatus": "cancelled",
                        "subscriptionId": None
                    }
                )
                logger.info(f"User {user.id} subscription cancelled")

        elif event.type == "customer.subscription.updated":
            subscription = event.data.object
            customer_id = subscription.customer

            user = await db.user.find_first(
                where={"stripeCustomerId": customer_id}
            )

            if user:
                status = "pro" if subscription.status == "active" else "free"
                await db.user.update(
                    where={"id": user.id},
                    data={"subscriptionStatus": status}
                )

        return {"status": "success", "event": event.type}


# Singleton instance
billing_service = BillingService()
