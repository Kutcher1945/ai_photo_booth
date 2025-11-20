from dataclasses import dataclass
from typing import List, Literal, Tuple
import os
import random
import time
import requests
from django.conf import settings
from django.core.mail import EmailMessage

DeliveryMethod = Literal["email", "sms", "telegram"]


@dataclass
class ChannelResult:
    channel: DeliveryMethod
    success: bool
    detail: str
    error: str | None = None


@dataclass
class SendOutcome:
    success: bool
    attempts: List[ChannelResult]


SendPayload = Tuple[str, List[str]]  # recipient, photos

CHANNEL_PRIORITY: List[DeliveryMethod] = ["email", "sms", "telegram"]


def _simulate_provider_latency(min_ms: int = 150, max_ms: int = 400) -> None:
    time.sleep(random.uniform(min_ms, max_ms) / 1000)


def _send_email(payload: SendPayload) -> str:
    recipient, photos = payload
    subject = "Your AI Photo Booth photos"
    body = "Thanks for using AI Photo Booth! Your photos are attached."

    # Attach images when possible (download from URLs)
    max_bytes = int(os.getenv("EMAIL_ATTACHMENT_MAX_BYTES", str(8 * 1024 * 1024)))  # 8MB default
    attachments_added = 0

    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )

    for idx, url in enumerate(photos):
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            content = resp.content
            if len(content) > max_bytes:
                raise RuntimeError("attachment too large")
            content_type = resp.headers.get("Content-Type", "image/jpeg")
            filename = f"photo_{idx + 1}.jpg"
            email.attach(filename, content, content_type)
            attachments_added += 1
        except Exception:
            # If an attachment fails, continue with links in the body
            continue

    sent = email.send(fail_silently=False)
    if sent == 0:
        raise RuntimeError("Email sending failed")
    return f"Sent {len(photos)} photo(s) to {recipient} via email (attachments: {attachments_added})"


def _twilio_send_message(recipient: str, body: str) -> str:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    messaging_sid = os.getenv("TWILIO_MESSAGING_SERVICE_SID")
    from_number = os.getenv("TWILIO_FROM_NUMBER")

    if not account_sid or not auth_token:
        raise RuntimeError("Twilio credentials are not configured")

    if not (messaging_sid or from_number):
        raise RuntimeError("Provide TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER")

    data = {
        "To": recipient,
        "Body": body[:1500],  # Twilio limit ~1600 chars
    }
    if messaging_sid:
        data["MessagingServiceSid"] = messaging_sid
    else:
        data["From"] = from_number

    response = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        data=data,
        auth=(account_sid, auth_token),
        timeout=10,
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"Twilio API error {response.status_code}: {response.text}"
        )

    return response.json().get("sid", "")


def _send_sms(payload: SendPayload) -> str:
    recipient, photos = payload
    link = photos[0] if photos else ""
    extra = len(photos) - 1
    summary = f"Your AI Photo Booth photo{'s' if len(photos) != 1 else ''}"
    if extra > 0:
        summary += f" (+{extra} more)"
    body = f"{summary}. {link or 'Check your email for attachments.'}"
    _twilio_send_message(recipient, body)
    return f"Sent download link(s) for {len(photos)} photo(s) via SMS to {recipient}"


def _send_telegram_message(chat_id: str, text: str) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    # Telegram accepts chat_id as numeric ID or @username once the user started the bot.
    api_url = f"https://api.telegram.org/bot{token}/sendMessage"

    response = requests.post(
        api_url,
        timeout=10,
        json={
            "chat_id": chat_id,
            "text": text,
            "disable_web_page_preview": False,
        },
    )
    if response.status_code != 200:
        raise RuntimeError(
            f"Telegram API error {response.status_code}: {response.text}"
        )

def _send_telegram_photo(chat_id: str, photo_url: str, caption: str = "") -> None:
    """Send a photo to Telegram by downloading and uploading it"""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    # Replace public endpoint with internal Docker endpoint for downloading
    # This allows the worker to access MinIO from inside Docker network
    public_endpoint = os.getenv("MINIO_PUBLIC_ENDPOINT", "localhost:9000")
    internal_endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
    internal_url = photo_url.replace(f"http://{public_endpoint}", f"http://{internal_endpoint}")
    internal_url = internal_url.replace(f"https://{public_endpoint}", f"http://{internal_endpoint}")

    # Download the photo from MinIO using internal URL
    photo_response = requests.get(internal_url, timeout=10)
    photo_response.raise_for_status()
    photo_content = photo_response.content

    api_url = f"https://api.telegram.org/bot{token}/sendPhoto"

    # Upload the photo as multipart/form-data
    files = {
        "photo": ("photo.jpg", photo_content, "image/jpeg")
    }
    data = {
        "chat_id": chat_id,
        "caption": caption,
    }

    response = requests.post(
        api_url,
        timeout=30,
        files=files,
        data=data,
    )
    if response.status_code != 200:
        raise RuntimeError(
            f"Telegram API error {response.status_code}: {response.text}"
        )


def _send_telegram(payload: SendPayload) -> str:
    recipient, photos = payload

    # Send intro message
    intro = f"📸 Your AI Photo Booth photos ({len(photos)} photo{'s' if len(photos) != 1 else ''}):"
    _send_telegram_message(recipient, intro)

    # Send each photo as actual image
    for idx, photo_url in enumerate(photos):
        try:
            caption = f"Photo {idx + 1} of {len(photos)}"
            _send_telegram_photo(recipient, photo_url, caption)
        except Exception as e:
            # If photo send fails, try sending as link
            _send_telegram_message(recipient, f"Photo {idx + 1}: {photo_url}")
            raise RuntimeError(f"Failed to send photo {idx + 1}: {str(e)}")

    username = recipient.removeprefix("@")
    return f"Delivered {len(photos)} photo(s) to @{username or recipient} on Telegram"


CHANNEL_SENDERS = {
    "email": _send_email,
    "sms": _send_sms,
    "telegram": _send_telegram,
}


def _should_fail(channel: DeliveryMethod) -> bool:
    """
    Simulate transient provider failures only when explicitly enabled.
    """
    if os.getenv("SIMULATE_DELIVERY_FAILURES", "false").lower() != "true":
        return False

    fail_rate = {
        "email": 0.15,
        "sms": 0.2,
        "telegram": 0.1,
    }
    return random.random() < fail_rate[channel]


def send_photos_with_fallback(
    recipient: str, photos: List[str], preferred: DeliveryMethod
) -> SendOutcome:
    """
    Try the preferred channel first, then fall back through the rest.
    """
    order: List[DeliveryMethod] = [preferred] + [
        channel for channel in CHANNEL_PRIORITY if channel != preferred
    ]

    attempts: List[ChannelResult] = []

    for channel in order:
        sender = CHANNEL_SENDERS[channel]
        try:
            if _should_fail(channel):
                raise RuntimeError(f"{channel} provider unavailable")

            detail = sender((recipient, photos))
            attempts.append(ChannelResult(channel=channel, success=True, detail=detail))
            return SendOutcome(success=True, attempts=attempts)
        except Exception as exc:  # noqa: BLE001 - we want to capture any provider failure
            attempts.append(
                ChannelResult(
                    channel=channel,
                    success=False,
                    detail=f"Failed to send via {channel}",
                    error=str(exc),
                )
            )

    return SendOutcome(success=False, attempts=attempts)


def send_status_sms(phone: str, message: str) -> str:
    """
    Send a simple status SMS (used to notify about email/telegram delivery).
    """
    return _twilio_send_message(phone, message)


def send_plain_telegram_message(chat_id: str, message: str) -> str:
    _send_telegram_message(chat_id, message)
    return f"Delivered Telegram message to {chat_id}"
