import json
from typing import Any, Dict

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .tasks import (
    send_photos_task,
    send_broadcast_email_task,
    send_general_notification_task,
)
from .models import Subscriber


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
    if not email or not isinstance(email, str) or "@" not in email:
        return JsonResponse({"error": "Valid email is required"}, status=400)

    subscriber, created = Subscriber.objects.get_or_create(email=email.strip().lower())
    return JsonResponse({"subscribed": True, "created": created}, status=200)


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
