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
    SMS/Telegram are simulated for now.
    """
    recipients = list(Subscriber.objects.values_list("email", flat=True))
    sent_email = 0
    failed_email = []

    for email in recipients:
        try:
            msg = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            )
            msg.send(fail_silently=False)
            sent_email += 1
        except Exception as exc:
            failed_email.append({"email": email, "error": str(exc)})

    simulated_sms = len(recipients) if include_sms else 0
    simulated_telegram = len(recipients) if include_telegram else 0

    return {
        "recipients": len(recipients),
        "email": {"sent": sent_email, "failed": failed_email},
        "sms_simulated": simulated_sms,
        "telegram_simulated": simulated_telegram,
    }
