# Generated manually for Telegram deep linking

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_subscriber_telegram_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='TelegramSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.CharField(default=uuid.uuid4, max_length=64, unique=True)),
                ('telegram_username', models.CharField(help_text='@username entered by user', max_length=64)),
                ('telegram_chat_id', models.CharField(blank=True, help_text='Captured when user starts bot', max_length=128, null=True)),
                ('photos', models.JSONField(default=list, help_text='Photos to send (data URLs or presigned URLs)')),
                ('preferred_method', models.CharField(default='telegram', max_length=20)),
                ('notification_phone', models.CharField(blank=True, max_length=20, null=True)),
                ('is_linked', models.BooleanField(default=False, help_text='True when user started bot')),
                ('is_sent', models.BooleanField(default=False, help_text='True when photos were sent')),
                ('task_id', models.CharField(blank=True, help_text='Celery task ID', max_length=64, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(help_text='Session expires after 15 minutes')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='telegramsession',
            index=models.Index(fields=['session_id'], name='notificatio_session_idx'),
        ),
        migrations.AddIndex(
            model_name='telegramsession',
            index=models.Index(fields=['telegram_username'], name='notificatio_telegra_idx'),
        ),
    ]
