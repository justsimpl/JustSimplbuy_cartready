from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import stripe


@dataclass
class CheckoutSessionRequest:
    amount: float
    currency: str
    success_url: str
    cancel_url: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    payment_methods: List[str] = field(default_factory=lambda: ["card"])


@dataclass
class CheckoutSessionResponse:
    session_id: str
    url: str


@dataclass
class CheckoutStatusResponse:
    status: str
    payment_status: str


@dataclass
class WebhookResponse:
    session_id: str
    payment_status: str


class StripeCheckout:
    def __init__(self, api_key: Optional[str], webhook_url: Optional[str] = None):
        self.api_key = api_key
        self.webhook_url = webhook_url
        if api_key:
            stripe.api_key = api_key

    async def create_checkout_session(self, request: CheckoutSessionRequest) -> CheckoutSessionResponse:
        if not self.api_key:
            raise ValueError("STRIPE_API_KEY is not configured")

        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            line_items=[
                {
                    "price_data": {
                        "currency": request.currency,
                        "product_data": {"name": "JustSimplBuying Order"},
                        "unit_amount": int(round(request.amount * 100)),
                    },
                    "quantity": 1,
                }
            ],
            metadata=request.metadata,
            payment_method_types=["card"],
        )
        return CheckoutSessionResponse(session_id=session.id, url=session.url)

    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResponse:
        if not self.api_key:
            raise ValueError("STRIPE_API_KEY is not configured")

        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = "paid" if session.payment_status == "paid" else session.payment_status
        return CheckoutStatusResponse(status=session.status, payment_status=payment_status)

    async def handle_webhook(self, body: bytes, signature: Optional[str]) -> WebhookResponse:
        if not self.api_key:
            raise ValueError("STRIPE_API_KEY is not configured")

        secret = stripe.api_key  # fallback; real deployments should use STRIPE_WEBHOOK_SECRET
        event = stripe.Webhook.construct_event(body, signature, secret)
        session = event["data"]["object"]
        payment_status = "paid" if session.get("payment_status") == "paid" else session.get("payment_status", "pending")
        return WebhookResponse(session_id=session.get("id", ""), payment_status=payment_status)
