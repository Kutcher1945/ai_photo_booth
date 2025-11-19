import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "photo_booth_backend.settings")

celery_app = Celery("photo_booth_backend")

# Broker defaults to local Redis; override with CELERY_BROKER_URL env.
celery_app.conf.broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
celery_app.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND", "")
celery_app.conf.task_default_queue = "default"
celery_app.conf.task_routes = {
    "notifications.tasks.send_photos_task": {"queue": "notifications"},
    "notifications.tasks.send_broadcast_email_task": {"queue": "notifications"},
    "notifications.tasks.send_general_notification_task": {"queue": "notifications"},
}

if os.getenv("ENABLE_DAILY_NOTIFICATION", "false").lower() == "true":
    hour = int(os.getenv("DAILY_NOTIFICATION_HOUR", "9"))
    minute = int(os.getenv("DAILY_NOTIFICATION_MINUTE", "0"))
    subject = os.getenv("DAILY_NOTIFICATION_SUBJECT", "AI Photo Booth Reminder")
    body = os.getenv(
        "DAILY_NOTIFICATION_BODY",
        "Зайдите и сделайте сегодня шикарное фото!",
    )

    celery_app.conf.beat_schedule = {
        "daily-engagement-notification": {
            "task": "notifications.tasks.send_general_notification_task",
            "schedule": crontab(hour=hour, minute=minute),
            "args": (subject, body),
            "kwargs": {"include_sms": False, "include_telegram": False},
            "options": {"queue": "notifications"},
        }
    }

celery_app.autodiscover_tasks()


@celery_app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
