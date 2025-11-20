from django.urls import path

from .views import (
    send_photos,
    subscribe_email,
    broadcast_email,
    send_general_notification,
    telegram_webhook,
    check_session_status,
)

urlpatterns = [
    path("send/", send_photos, name="send_photos"),
    path("subscribe/", subscribe_email, name="subscribe_email"),
    path("broadcast/", broadcast_email, name="broadcast_email"),
    path("notify/", send_general_notification, name="send_general_notification"),
    path("telegram/webhook/", telegram_webhook, name="telegram_webhook"),
    path("telegram/session/", check_session_status, name="check_session_status"),
]
