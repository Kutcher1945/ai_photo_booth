# Telegram Deep Linking Setup Guide

## ✅ What Was Implemented

I've implemented a **seamless Telegram deep linking solution** that allows users to enter their @username and automatically receive photos without manually starting the bot first!

### How It Works Now:

```
1. User enters @username on website
2. System creates a temporary session
3. User clicks "Open Telegram & Start Bot" button
4. Telegram opens automatically with /start pre-filled
5. User taps "Send" (one tap!)
6. Bot captures chat_id and links to session
7. Photos sent automatically! ✅
```

---

## 🚀 Setup Steps

### Step 1: Configure Telegram Webhook

Your bot needs to know where to send updates when users click /start.

#### Option A: Using ngrok (For Testing Locally)

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # Or use brew/apt
   brew install ngrok  # macOS
   ```

2. **Start ngrok tunnel:**
   ```bash
   ngrok http 8000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

4. **Set webhook:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -d "url=https://abc123.ngrok-free.app/api/notifications/telegram/webhook/"
   ```

   Replace `<YOUR_BOT_TOKEN>` with your actual bot token from `.env`

#### Option B: Using Production Domain

If you have a public domain (e.g., `https://yourdomain.com`):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://yourdomain.com/api/notifications/telegram/webhook/"
```

### Step 2: Verify Webhook Setup

Check webhook status:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

You should see:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-url/api/notifications/telegram/webhook/",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Step 3: Update Frontend Bot Username

Edit the deep link URL in your code if your bot username is different:

**File:** `ai-photo-booth/components/screens/SendPhotoScreen.tsx` (line 175)

```typescript
// Change @ai_photo_booth_bot to your actual bot username
'Start @YOUR_BOT_USERNAME in Telegram, then enter your @username or chat ID.'
```

### Step 4: Test the Flow

1. **Start backend:**
   ```bash
   cd photo_booth_backend
   docker compose up
   ```

2. **Start frontend:**
   ```bash
   cd ai-photo-booth
   npm run dev
   ```

3. **Test:**
   - Go to http://localhost:3000
   - Take photos
   - Select "Telegram" delivery
   - Enter your @username (e.g., @adilannister)
   - Click "Send Photos"
   - Click "Open Telegram & Start Bot"
   - In Telegram, tap "Send"
   - Come back to website → Photos sent automatically! ✅

---

## 📱 User Experience

### Before (Broken):
```
❌ User enters @username
❌ Backend tries to send
❌ Error: "chat not found"
❌ User confused, photos not delivered
```

### After (Seamless):
```
✅ User enters @username
✅ Clicks "Open Telegram & Start Bot"
✅ Telegram opens automatically
✅ User taps "Send" (one tap)
✅ Photos delivered automatically!
✅ Website shows: "Connected! Sending photos..."
```

---

## 🔧 Technical Details

### New Backend Components:

1. **TelegramSession Model** (`models.py`)
   - Stores temporary sessions (15-minute expiry)
   - Links @username to chat_id
   - Tracks delivery status

2. **Webhook Endpoint** (`views.py:telegram_webhook`)
   - Receives Telegram /start commands
   - Captures user chat_id
   - Automatically triggers photo delivery

3. **Session Status Endpoint** (`views.py:check_session_status`)
   - Frontend polls this to detect when user starts bot
   - Shows real-time connection status

4. **Deep Link Generation** (`views.py:send_photos`)
   - Creates unique session IDs
   - Generates deep links: `https://t.me/bot?start=SESSION_ID`

### New Frontend Components:

1. **Polling Logic** (`SendPhotoScreen.tsx`)
   - Checks session status every 2 seconds
   - Updates UI in real-time

2. **Deep Link Button** (`SendPhotoScreen.tsx`)
   - Opens Telegram with /start pre-filled
   - Shows waiting spinner

3. **Status Indicators** (`SendPhotoScreen.tsx`)
   - "Waiting for you to start the bot..."
   - "Connected! Sending photos..."

---

## 🐛 Troubleshooting

### Issue: Webhook not receiving updates

**Solution:**
```bash
# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Delete webhook and set again
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-url/api/notifications/telegram/webhook/"
```

### Issue: "Session expired" error

**Solution:**
- Sessions expire after 15 minutes
- User needs to retry from website
- Adjust expiry in `views.py` line 65: `expires_at=timezone.now() + timedelta(minutes=15)`

### Issue: Frontend not showing "Open Telegram" button

**Solution:**
- Check browser console for errors
- Verify backend is running on http://localhost:8000
- Check `NEXT_PUBLIC_API_BASE_URL` in `.env.local`

### Issue: Photos not sending after user starts bot

**Solution:**
1. Check Celery worker logs:
   ```bash
   docker compose logs -f worker
   ```

2. Verify MinIO is running:
   ```bash
   docker compose ps minio
   ```

3. Check Telegram bot token is valid:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getMe"
   ```

---

## 🔒 Security Notes

### Important:
- Sessions expire after 15 minutes for security
- Webhook endpoint is CSRF-exempt (required for Telegram)
- Always use HTTPS in production (Telegram requirement)
- Store bot token securely in environment variables

### Production Checklist:
- [ ] Use HTTPS domain (required by Telegram)
- [ ] Set up proper CORS whitelist
- [ ] Enable rate limiting on webhook endpoint
- [ ] Add monitoring for failed deliveries
- [ ] Set up log aggregation
- [ ] Configure session cleanup job (delete expired sessions)

---

## 📊 Monitoring

### Check Session Status:

```bash
# In Django shell
docker compose run --rm web python manage.py shell

>>> from notifications.models import TelegramSession
>>> TelegramSession.objects.all()
```

### View Logs:

```bash
# Backend logs
docker compose logs -f web

# Worker logs
docker compose logs -f worker

# All logs
docker compose logs -f
```

---

## 🎯 Next Steps

### Optional Enhancements:

1. **Add cleanup task:**
   ```python
   # tasks.py
   @shared_task
   def cleanup_expired_sessions():
       from django.utils import timezone
       TelegramSession.objects.filter(expires_at__lt=timezone.now()).delete()
   ```

2. **Add analytics:**
   - Track conversion rate (sessions created vs completed)
   - Monitor average time to start bot
   - Log failed deliveries

3. **Improve UX:**
   - Add QR code for mobile users
   - Show step-by-step instructions
   - Add video tutorial

4. **Error handling:**
   - Retry failed deliveries
   - Send email fallback if Telegram fails
   - Notify user of delivery status via SMS

---

## 📝 API Endpoints

### New Endpoints:

1. **POST /api/notifications/send/**
   - Now returns `requires_telegram_start=true` for @username
   - Includes `session_id` and `deep_link`

2. **POST /api/notifications/telegram/webhook/**
   - Receives Telegram bot updates
   - Handles /start commands
   - Triggers photo delivery

3. **GET /api/notifications/telegram/session/?session_id=xxx**
   - Returns session status
   - Used for frontend polling

---

## ✅ Summary

Your Telegram integration now works with a **seamless deep linking flow**!

**Key Benefits:**
- ✅ Users don't need to manually start bot first
- ✅ One-click experience
- ✅ Real-time status updates
- ✅ Automatic photo delivery
- ✅ Secure with session expiry

**No more "chat not found" errors!** 🎉

---

## 📞 Support

If you encounter issues:
1. Check logs: `docker compose logs -f`
2. Verify webhook: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
3. Test bot directly: Send `/start` to your bot in Telegram
4. Check session expiry time (15 minutes default)

---

**Note:** You CANNOT send messages to Telegram users by @username alone without them starting the bot first. This is a Telegram security restriction that cannot be bypassed. This solution provides the best possible user experience within Telegram's limitations.
