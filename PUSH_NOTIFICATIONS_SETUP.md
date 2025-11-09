# Push Notifications Setup Guide

## Overview
The complete Push Notifications system has been implemented for Room XI Connect PWA. This guide will help you configure and test the system.

## What Was Implemented

### 1. Backend Components
- ✅ **Push Routes** (`server/routes/push.ts`): REST API endpoints for managing subscriptions
- ✅ **Push Service** (`server/services/pushNotification.ts`): Core notification sending logic
- ✅ **Database Schema**: `push_subscriptions` table for storing user subscriptions
- ✅ **Scheduler Integration**: Automated check-in reminders at 8 AM daily

### 2. Frontend Components
- ✅ **NotificationSettings Component**: Full-featured UI for managing notifications
- ✅ **Settings Page Integration**: Added to Settings page under notifications section
- ✅ **API Client Methods**: Push notification methods in `src/lib/api.ts`

### 3. Service Worker
- ✅ **Push Event Handler**: Receives and displays notifications
- ✅ **Notification Click Handler**: Routes users to relevant app pages
- ✅ **App-specific Routing**: Handles different notification types (check-in, events, mood support)

## Setup Instructions

### Step 1: Generate and Add VAPID Keys to Environment

**Generate VAPID Keys:**

First, generate a new pair of VAPID keys using the web-push package:

```bash
npx web-push generate-vapid-keys
```

This will output something like:
```
=======================================

Public Key:
<your_public_key_here>

Private Key:
<your_private_key_here>

=======================================
```

**Add Keys to .env File:**

Copy the generated keys and add them to your `.env` file (create it if it doesn't exist):

```bash
# Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY=<paste_your_public_key_here>
VAPID_PRIVATE_KEY=<paste_your_private_key_here>
VAPID_EMAIL=mailto:support@roomxiconnect.org
```

**CRITICAL SECURITY NOTES:** 
- **NEVER commit VAPID keys to git** - they should only exist in `.env` file
- `.env` is in `.gitignore` and will not be committed
- Generate separate keys for development and production environments
- For production, store keys securely in your deployment platform's environment variables
- Rotate keys regularly (every 90 days recommended)

### Step 2: Restart the Server

After adding the VAPID keys to `.env`, restart the dev server:

```bash
# The dev server should automatically restart
# Or manually restart if needed
npm run dev
```

Verify in the logs that you see:
```
✓ VAPID keys configured
```

Instead of:
```
⚠ VAPID keys not configured
```

### Step 3: Test Push Notifications

#### Enable Notifications in the App:

1. Navigate to Settings page (`/settings`)
2. Scroll to the "Push Notifications" section
3. Click "Enable Notifications"
4. Grant permission when the browser prompts
5. Click "Send Test Notification" to verify it works

#### What Happens Behind the Scenes:

1. Browser requests notification permission
2. Service worker subscribes to push manager
3. Subscription details sent to backend (`/api/push/subscribe`)
4. Backend stores subscription in `push_subscriptions` table
5. Test notification sent via Web Push API
6. Service worker receives and displays notification

## API Endpoints

### Public Endpoints:
- `GET /api/push/vapid-public-key` - Get VAPID public key for frontend

### Protected Endpoints (require authentication):
- `POST /api/push/subscribe` - Save push subscription
- `DELETE /api/push/unsubscribe` - Remove push subscription  
- `GET /api/push/status` - Check subscription status
- `POST /api/push/test` - Send test notification to yourself

### Admin Endpoints:
- `POST /api/push/send` - Send push notification to any user (admin only)

## Notification Types

### 1. Check-in Reminders
- **When**: Daily at 8:00 AM America/Edmonton time
- **Who**: Users with `notificationsEnabled: true` in privacy consents
- **Skip**: Users who already checked in today
- **Function**: `sendCheckinReminder(userId)`

### 2. Event Reminders
- **When**: 1 hour before program starts
- **Function**: `sendEventReminder(userId, programId)`
- **Action**: Links to program details page

### 3. Mood Drop Alerts
- **When**: Mood analysis detects concerning decline
- **Function**: `sendMoodDropAlert(userId)`
- **Action**: Links to crisis resources
- **Actions**: "View Resources" or "Not now"

### 4. Streak Celebrations
- **When**: User reaches milestone (3, 7, 14, 30, 60, 100 days)
- **Function**: `sendStreakCelebration(userId, streakDays)`

## Testing in Different Environments

### Desktop Browser:
1. Chrome/Edge: Full support ✅
2. Firefox: Full support ✅
3. Safari: Limited support (macOS Ventura+ only) ⚠️

### Mobile:
1. **Android (Chrome/Edge/Firefox)**: Full support ✅
2. **iOS Safari**: Not supported ❌
3. **iOS Chrome**: Uses Safari engine, not supported ❌

**Note:** For iOS, consider implementing in-app notifications as an alternative.

## Troubleshooting

### "Push notifications not configured"
- Check that VAPID keys are in `.env` file
- Restart the server after adding keys
- Verify keys are not wrapped in quotes

### Permission Denied
- Guide users to browser settings → Site Settings → Notifications
- Re-enable for your domain
- Refresh page and try again

### Notifications Not Appearing
1. Check browser console for errors
2. Verify service worker is registered: `navigator.serviceWorker.ready`
3. Check subscription status: `/api/push/status`
4. Ensure notifications are enabled in OS settings

### Testing Fails
- Verify database migration ran successfully
- Check server logs for errors
- Confirm user is authenticated
- Test with browser dev tools → Application → Service Workers

## Database Schema

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,  -- Encryption key
  auth TEXT NOT NULL,     -- Authentication secret
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE UNIQUE INDEX push_subscriptions_user_endpoint_idx 
  ON push_subscriptions(user_id, endpoint);
```

## Scheduled Tasks

The scheduler (`server/services/scheduler.js`) runs every minute and checks:

- **Sunday 8:00 AM**: Weekly orb snapshots
- **Daily 8:00 AM**: Check-in reminders (push notifications)
- **Daily 10:00 AM**: Morning nudges (legacy notification system)

## Security Considerations

1. **VAPID Keys**: Never commit to git, rotate regularly
2. **Subscriptions**: Automatically cleaned up when expired (410 status)
3. **Rate Limiting**: Protected by write limiter middleware
4. **CSRF Protection**: All POST/DELETE endpoints protected
5. **User Isolation**: Users can only manage their own subscriptions

## Browser Compatibility Matrix

| Browser         | Desktop | Android | iOS  |
|-----------------|---------|---------|------|
| Chrome          | ✅      | ✅      | ❌   |
| Firefox         | ✅      | ✅      | ❌   |
| Edge            | ✅      | ✅      | ❌   |
| Safari          | ⚠️      | N/A     | ❌   |
| Samsung Internet| N/A     | ✅      | N/A  |

✅ Full support | ⚠️ Partial support | ❌ Not supported

## Production Deployment Checklist

- [ ] Generate new VAPID keys for production
- [ ] Add VAPID keys to production environment variables
- [ ] Test on production domain (push requires HTTPS)
- [ ] Verify service worker registration
- [ ] Test notifications on target devices
- [ ] Set up monitoring for failed notifications
- [ ] Configure notification content for brand voice
- [ ] Test unsubscribe flow
- [ ] Verify scheduled tasks are running
- [ ] Document for support team

## Monitoring & Analytics

Consider tracking:
- Subscription rate (% of users who enable)
- Notification delivery rate
- Click-through rate on notifications
- Unsubscribe rate
- Most effective notification types

## Future Enhancements

Potential improvements:
- [ ] Notification preferences (granular control per type)
- [ ] Time zone-aware scheduling per user
- [ ] Rich notifications with images
- [ ] Notification history in app
- [ ] A/B testing for notification content
- [ ] Analytics dashboard for notification performance

## Resources

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Push API MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web-push NPM Package](https://www.npmjs.com/package/web-push)

## Support

For issues or questions:
1. Check server logs: `/tmp/logs/Dev_Server_*.log`
2. Check browser console for client-side errors
3. Review this guide's troubleshooting section
4. Test with the `/api/push/test` endpoint
