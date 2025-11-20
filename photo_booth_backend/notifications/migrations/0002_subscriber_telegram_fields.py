from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriber",
            name="telegram_chat_id",
            field=models.CharField(
                blank=True,
                help_text="Numeric chat_id or @username",
                max_length=128,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="subscriber",
            name="telegram_username",
            field=models.CharField(
                blank=True,
                help_text="@username (optional, for display)",
                max_length=64,
                null=True,
            ),
        ),
    ]
