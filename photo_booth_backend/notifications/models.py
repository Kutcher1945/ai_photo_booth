from django.db import models
import uuid


class Subscriber(models.Model):
    email = models.EmailField(unique=True)
    telegram_chat_id = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        help_text="Numeric chat_id or @username",
    )
    telegram_username = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="@username (optional, for display)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.email


class TelegramSession(models.Model):
    """Temporary session to link Telegram chat_id with photo delivery"""
    session_id = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    telegram_username = models.CharField(max_length=64, help_text="@username entered by user")
    telegram_chat_id = models.CharField(max_length=128, blank=True, null=True, help_text="Captured when user starts bot")
    photos = models.JSONField(default=list, help_text="Photos to send (data URLs or presigned URLs)")
    preferred_method = models.CharField(max_length=20, default="telegram")
    notification_phone = models.CharField(max_length=20, blank=True, null=True)

    # Status tracking
    is_linked = models.BooleanField(default=False, help_text="True when user started bot")
    is_sent = models.BooleanField(default=False, help_text="True when photos were sent")
    task_id = models.CharField(max_length=64, blank=True, null=True, help_text="Celery task ID")

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Session expires after 15 minutes")

    def __str__(self) -> str:
        return f"{self.telegram_username} - {self.session_id}"

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["session_id"]),
            models.Index(fields=["telegram_username"]),
        ]
