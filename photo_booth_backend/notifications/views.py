import json
from typing import Any, Dict
from datetime import timedelta
from django.utils import timezone
import uuid

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .tasks import (
    send_photos_task,
    send_broadcast_email_task,
    send_general_notification_task,
)
from .models import Subscriber, TelegramSession


@csrf_exempt
def send_photos(request):
    if request.method == "OPTIONS":
        # Allow CORS preflight
        return JsonResponse({}, status=200)

    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        payload: Dict[str, Any] = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    recipient = payload.get("recipient")
    photos = payload.get("photos", [])
    preferred = payload.get("preferred_method", "email")

    if not recipient or not isinstance(recipient, str):
        return JsonResponse({"error": "recipient is required"}, status=400)

    if not isinstance(photos, list) or not all(isinstance(item, str) for item in photos):
        return JsonResponse({"error": "photos must be a list of strings"}, status=400)

    if preferred not in {"email", "sms", "telegram"}:
        return JsonResponse({"error": "preferred_method must be email, sms, or telegram"}, status=400)

    if preferred == "email":
        if "@" not in recipient or recipient.startswith("@"):
            return JsonResponse({"error": "Invalid email address"}, status=400)

    notification_phone = payload.get("notification_phone")
    notification_phone_normalized = None

    if preferred == "telegram":
        if not recipient.startswith("@") and not recipient.isdigit():
            return JsonResponse({"error": "Invalid Telegram chat. Provide @username after starting the bot or numeric chat ID."}, status=400)

        # If username provided, create a session for deep linking
        if recipient.startswith("@"):
            session = TelegramSession.objects.create(
                session_id=str(uuid.uuid4())[:8],
                telegram_username=recipient,
                photos=photos,
                preferred_method=preferred,
                notification_phone=payload.get("notification_phone"),
                expires_at=timezone.now() + timedelta(minutes=15),
            )
            return JsonResponse(
                {
                    "requires_telegram_start": True,
                    "session_id": session.session_id,
                    "deep_link": f"https://t.me/ai_photo_booth_bot?start={session.session_id}",
                    "username": recipient,
                },
                status=200,
            )

    if preferred == "sms":
        normalized = recipient.replace(" ", "").replace("-", "")
        if not normalized.startswith("+") or not normalized[1:].isdigit():
            return JsonResponse({"error": "Phone number must be in international format, e.g. +1234567890"}, status=400)
    if notification_phone:
        normalized_phone = notification_phone.replace(" ", "").replace("-", "")
        if not normalized_phone.startswith("+") or not normalized_phone[1:].isdigit():
            return JsonResponse({"error": "notification_phone must be in international format, e.g. +1234567890"}, status=400)
        notification_phone_normalized = normalized_phone

    async_result = send_photos_task.delay(
        recipient=recipient.strip(),
        photos=photos,
        preferred_method=preferred,  # type: ignore[arg-type]
        notification_phone=notification_phone_normalized,
    )
    return JsonResponse(
        {
            "accepted": True,
            "task_id": async_result.id,
        },
        status=202,
    )


@csrf_exempt
@require_POST
def subscribe_email(request):
    try:
        payload: Dict[str, Any] = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    email = payload.get("email")
    telegram_chat_id = payload.get("telegram_chat_id")
    telegram_username = payload.get("telegram_username")

    if not email or not isinstance(email, str) or "@" not in email:
        return JsonResponse({"error": "Valid email is required"}, status=400)

    if telegram_chat_id and not isinstance(telegram_chat_id, str):
        return JsonResponse({"error": "telegram_chat_id must be a string"}, status=400)

    if telegram_username and not isinstance(telegram_username, str):
        return JsonResponse({"error": "telegram_username must be a string"}, status=400)

    subscriber, created = Subscriber.objects.get_or_create(email=email.strip().lower())

    updated = False
    if telegram_chat_id:
        subscriber.telegram_chat_id = telegram_chat_id.strip()
        updated = True
    if telegram_username:
        subscriber.telegram_username = telegram_username.strip()
        updated = True

    if updated:
        subscriber.save(update_fields=["telegram_chat_id", "telegram_username"])

    return JsonResponse(
        {
            "subscribed": True,
            "created": created,
            "telegram_chat_id": subscriber.telegram_chat_id,
            "telegram_username": subscriber.telegram_username,
        },
        status=200,
    )


@csrf_exempt
@require_POST
def broadcast_email(request):
    try:
        payload: Dict[str, Any] = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    subject = payload.get("subject") or "Photo Booth Updates"
    body = payload.get("body")

    if not body or not isinstance(body, str):
        return JsonResponse({"error": "body is required"}, status=400)

    async_result = send_broadcast_email_task.delay(subject=subject, body=body)
    return JsonResponse({"accepted": True, "task_id": async_result.id}, status=202)


@csrf_exempt
@require_POST
def send_general_notification(request):
    try:
        payload: Dict[str, Any] = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    subject = payload.get("subject") or "Photo Booth Updates"
    body = payload.get("body")
    include_sms = bool(payload.get("include_sms"))
    include_telegram = bool(payload.get("include_telegram"))

    if not body or not isinstance(body, str):
        return JsonResponse({"error": "body is required"}, status=400)

    async_result = send_general_notification_task.delay(
        subject=subject,
        body=body,
        include_sms=include_sms,
        include_telegram=include_telegram,
    )
    return JsonResponse({"accepted": True, "task_id": async_result.id}, status=202)


@csrf_exempt
def telegram_webhook(request):
    """Handle incoming Telegram bot updates (when user clicks /start)"""
    if request.method == "OPTIONS":
        return JsonResponse({}, status=200)

    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        update = json.loads(request.body.decode("utf-8"))
        message = update.get("message", {})

        # Extract user info
        chat_id = str(message.get("chat", {}).get("id", ""))
        username = message.get("from", {}).get("username", "")
        first_name = message.get("from", {}).get("first_name", "User")
        text = message.get("text", "")

        if not chat_id:
            return JsonResponse({"ok": True}, status=200)

        # Handle /start command with deep link parameter
        if text.startswith("/start"):
            parts = text.split(" ", 1)
            session_id = parts[1] if len(parts) > 1 else None

            # If session_id provided, link it and send photos
            if session_id:
                try:
                    session = TelegramSession.objects.get(
                        session_id=session_id,
                        is_linked=False,
                        expires_at__gt=timezone.now(),
                    )

                    # Link chat_id to session
                    session.telegram_chat_id = chat_id
                    session.is_linked = True
                    session.save()

                    # Store in subscriber database for future use
                    if username:
                        subscriber, _ = Subscriber.objects.get_or_create(
                            telegram_username=f"@{username}",
                            defaults={"email": f"{username}@telegram.temp"},
                        )
                        subscriber.telegram_chat_id = chat_id
                        subscriber.save()

                    # Send photos immediately
                    from .services import _send_telegram_message
                    _send_telegram_message(
                        chat_id,
                        f"Hi {first_name}! Your photos are being sent now...",
                    )

                    # Queue photo delivery task
                    async_result = send_photos_task.delay(
                        recipient=chat_id,
                        photos=session.photos,
                        preferred_method=session.preferred_method,
                        notification_phone=session.notification_phone,
                    )

                    session.is_sent = True
                    session.task_id = async_result.id
                    session.save()

                except TelegramSession.DoesNotExist:
                    # Session expired or invalid
                    from .services import _send_telegram_message
                    _send_telegram_message(
                        chat_id,
                        "Sorry, this link has expired. Please try again from the photo booth website.",
                    )

            else:
                # Normal /start without session - just welcome
                from .services import _send_telegram_message
                welcome_msg = (
                    f"Welcome {first_name}!\n\n"
                    "I'm the AI Photo Booth bot.\n"
                    "Use the photo booth website to take photos, "
                    "then enter your @username to receive them here!"
                )
                _send_telegram_message(chat_id, welcome_msg)

                # Save user for future lookups
                if username:
                    subscriber, _ = Subscriber.objects.get_or_create(
                        telegram_username=f"@{username}",
                        defaults={"email": f"{username}@telegram.temp"},
                    )
                    subscriber.telegram_chat_id = chat_id
                    subscriber.save()

        return JsonResponse({"ok": True}, status=200)

    except Exception as e:
        print(f"Telegram webhook error: {e}")
        return JsonResponse({"ok": True}, status=200)  # Always return 200 to Telegram


@csrf_exempt
def check_session_status(request):
    """Check if Telegram session is linked (user clicked Start)"""
    if request.method == "OPTIONS":
        return JsonResponse({}, status=200)

    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    session_id = request.GET.get("session_id")
    if not session_id:
        return JsonResponse({"error": "session_id required"}, status=400)

    try:
        session = TelegramSession.objects.get(session_id=session_id)

        if session.expires_at < timezone.now():
            return JsonResponse(
                {
                    "session_id": session_id,
                    "is_linked": False,
                    "is_sent": False,
                    "expired": True,
                },
                status=200,
            )

        return JsonResponse(
            {
                "session_id": session_id,
                "is_linked": session.is_linked,
                "is_sent": session.is_sent,
                "task_id": session.task_id,
                "expired": False,
            },
            status=200,
        )

    except TelegramSession.DoesNotExist:
        return JsonResponse({"error": "Session not found"}, status=404)
