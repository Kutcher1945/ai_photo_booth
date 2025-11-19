# Photo Booth — фронт + бэкенд (русский обзор)

## Что это
- **Фронт (Next.js, TypeScript)**: веб-фото-кабина — пользователь выбирает режим, делает снимки в браузере, отправляет их себе через Email/SMS/Telegram. Общение с бэком по REST.
- **Бэкенд (Django, Celery, Redis, MinIO)**: принимает запросы на отправку фото/уведомлений, складывает файлы в MinIO, шлёт письма (SMTP с вложениями), имитирует SMS/Telegram (или реальный Telegram при наличии токена), асинхронные задачи через Celery/Redis. Есть подписка и массовая рассылка.

## Как это работает (поток)
1) Пользователь на фронте делает фото (видео поток → canvas → base64).
2) Фронт отправляет на бэкенд `POST /api/notifications/send/` с фото, предпочтительным каналом и, при желании, номером для SMS-уведомления о доставке.
3) Celery-задача:
   - грузит фото в MinIO, генерирует 24h presigned URL;
   - для email скачивает эти URL и прикладывает как вложения (если укладываются в лимит размера);
   - пробует доставку по выбранному каналу, при ошибке — фолбэк к следующему (email → sms → telegram).
4) Результат доставки пишется в лог задачи; фронт получает `task_id` и сразу показывает успех.

Отдельно:
- Подписка email (`/subscribe/`) и рассылки (`/broadcast/` или `/notify/`) отправляют письма всем подписчикам (SMS/Telegram пока симулируются в `/notify/`).
- Ежедневные уведомления: Celery Beat (по расписанию из `.env`) запускает `send_general_notification_task`, напоминая подписчикам «зайдите и сделайте фото».

## Стек и сервисы
- Frontend: Next.js 16, React 19, TypeScript, Tailwind/Framer Motion.
- Backend: Django 4.2, Celery 5, Redis (broker), MinIO (S3-хранилище), Gunicorn.
- Рассылка: SMTP (из env), Telegram Bot API (если задан токен), SMS — пока заглушка.
  - Для SMS теперь используется Twilio: задайте `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (или `TWILIO_FROM_NUMBER`).

## Запуск (Docker Compose)
```bash
cd photo_booth_backend
docker compose up --build
```
Сервисы:
- `web` (Django + Gunicorn) — `http://localhost:8000`
- `worker` (Celery) — очередь `notifications`
- `redis` — брокер задач
- `minio` — API `http://localhost:9000`, консоль `http://localhost:9001` (minioadmin/minioadmin по умолчанию)

Env (`photo_booth_backend/.env`): SMTP, Telegram_bot_token, MinIO и пр. Пример в `.env.example`.

Миграции:
```bash
docker compose run --rm web python manage.py migrate
```

## API (бэкенд)
Базовый URL: `http://localhost:8000/api/notifications/`
- `POST /send/` — отправить фото. Body: `recipient`, `photos` (data URL или http ссылки), `preferred_method` = email|sms|telegram, `notification_phone?` (E.164). Возврат: `{accepted, task_id}`; Celery делает доставку с фолбэком по каналам, и при успешной email/telegram-доставке отправляет SMS-уведомление на `notification_phone`.
- `POST /subscribe/` — подписать email: `{email}` (idempotent).
- `POST /broadcast/` — рассылка всем подписчикам: `{subject?, body}`.
- `POST /notify/` — простое уведомление всем подписчикам (email реально, SMS/Telegram — симуляция пока): `{subject?, body, include_sms?, include_telegram?}`.

## Логика доставки
1) Фронт отправляет снимки → бэкенд → Celery-задача.
2) Задача грузит фото в MinIO, генерирует presigned URL, для email — скачивает и прикрепляет как вложения (и/или ссылки, если вложения не доступны).
3) Каналы с фолбэком: сначала preferred, если провал — дальше по списку (email → sms → telegram).
4) Email: SMTP из env; Telegram: Bot API при наличии `TELEGRAM_BOT_TOKEN`; SMS: заглушка (только сообщение о попытке).

## Директории
- `ai-photo-booth/` — фронтенд (Next.js).
- `photo_booth_backend/` — бэкенд (Django+Celery) и docker-compose.
- `photo_booth_backend/notifications/` — задачи, сервисы доставки, модели подписчиков.

## Фронт
- Путь: `ai-photo-booth/`
- Env: `NEXT_PUBLIC_API_BASE_URL` (по умолчанию `http://localhost:8000`).
- UI: выбор режима, съёмка, предпросмотр, выбор канала доставки, ввод контакта (валидация email/telegram), отправка → успех.

Запуск фронта:
```bash
cd ai-photo-booth
npm install  # или pnpm/yarn
npm run dev
```
По умолчанию общается с `http://localhost:8000/api/notifications/`.

## Дополнительно
- Камера требует https или localhost. Дайте разрешение на камеру в браузере.
- Ограничение вложений email: `EMAIL_ATTACHMENT_MAX_BYTES` (по умолчанию 8MB за файл).
- Симуляция сбоев доставки выключена по умолчанию (`SIMULATE_DELIVERY_FAILURES=false`).
- MinIO bucket создаётся автоматически (имя `MINIO_BUCKET`, дефолт `photobooth`).
- SMS через Twilio: заполните `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (или `TWILIO_FROM_NUMBER`). Номер получателя должен быть в формате E.164 (`+123456789`).
- Авторассылка по расписанию: включите `ENABLE_DAILY_NOTIFICATION=true`, задайте `DAILY_NOTIFICATION_HOUR/MINUTE` и текст (`DAILY_NOTIFICATION_SUBJECT/BODY`). Нужен запущенный Celery Beat (`docker compose up beat`).
- База данных: по умолчанию SQLite. Чтобы использовать PostgreSQL, задайте `POSTGRES_DB/USER/PASSWORD/HOST/PORT` (compose поднимет сервис `postgres` на `localhost:5432`).
