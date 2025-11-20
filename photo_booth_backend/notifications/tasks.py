from celery import shared_task

from .services import DeliveryMethod, send_photos_with_fallback, send_status_sms
from .storage import upload_photos_and_presign
from django.core.mail import EmailMessage
from django.conf import settings
from .models import Subscriber


@shared_task(name="notifications.tasks.send_photos_task")
def send_photos_task(
    recipient: str,
    photos: list[str],
    preferred_method: DeliveryMethod,
    notification_phone: str | None = None,
) -> dict:
    presigned_photos = upload_photos_and_presign(photos)

    result = send_photos_with_fallback(
        recipient=recipient,
        photos=presigned_photos,
        preferred=preferred_method,
    )
    status_notification = None

    if (
        notification_phone
        and result.success
        and preferred_method in {"email", "telegram"}
    ):
        try:
            last_channel = result.attempts[-1].channel if result.attempts else preferred_method
            message = f"Your AI Photo Booth photos were delivered via {last_channel.upper()}."
            send_status_sms(notification_phone, message)
            status_notification = {"sent": True, "channel": "sms", "message": message}
        except Exception as exc:
            status_notification = {"sent": False, "channel": "sms", "error": str(exc)}

    return {
        "success": result.success,
        "attempts": [
            {
                "channel": attempt.channel,
                "success": attempt.success,
                "detail": attempt.detail,
                "error": attempt.error,
            }
            for attempt in result.attempts
        ],
        "status_notification": status_notification,
    }


@shared_task(name="notifications.tasks.send_broadcast_email_task")
def send_broadcast_email_task(subject: str, body: str) -> dict:
    recipients = list(Subscriber.objects.values_list("email", flat=True))
    sent = 0
    failed = []

    for email in recipients:
        try:
            msg = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            )
            msg.send(fail_silently=False)
            sent += 1
        except Exception as exc:
            failed.append({"email": email, "error": str(exc)})

    return {"total": len(recipients), "sent": sent, "failed": failed}


@shared_task(name="notifications.tasks.send_general_notification_task")
def send_general_notification_task(
    subject: str,
    body: str,
    include_sms: bool = False,
    include_telegram: bool = False,
) -> dict:
    """
    Send a plain notification email to all subscribers.
    Telegram notifications are real if chat data exists.
    SMS is simulated until numbers are collected.
    """
    subscribers = Subscriber.objects.all()
    sent_email = 0
    failed_email = []
    sent_telegram = 0
    failed_telegram = []

    for subscriber in subscribers:
        if subscriber.email:
            try:
                msg = EmailMessage(
                    subject=subject,
                    body=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[subscriber.email],
                )
                msg.send(fail_silently=False)
                sent_email += 1
            except Exception as exc:
                failed_email.append({"email": subscriber.email, "error": str(exc)})

        if include_telegram:
            chat_id = subscriber.telegram_chat_id or subscriber.telegram_username
            if chat_id:
                try:
                    send_plain_telegram_message(chat_id, body)
                    sent_telegram += 1
                except Exception as exc:
                    failed_telegram.append({"chat": chat_id, "error": str(exc)})

    simulated_sms = subscribers.count() if include_sms else 0

    return {
        "recipients": subscribers.count(),
        "email": {"sent": sent_email, "failed": failed_email},
        "telegram": {
            "sent": sent_telegram,
            "failed": failed_telegram,
        }
        if include_telegram
        else None,
        "sms_simulated": simulated_sms,
    }
