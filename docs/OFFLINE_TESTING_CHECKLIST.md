# Room XI Connect - Offline Testing Checklist

This checklist validates offline functionality for production readiness. These tests require manual execution on real devices with actual network disconnection.

## Pre-Test Setup

1. [ ] Open Room XI Connect in Chrome/Safari on mobile device
2. [ ] Enable "Install App" / "Add to Home Screen" to test PWA
3. [ ] Log in with a test account
4. [ ] Complete at least one mood check-in while online
5. [ ] Navigate to Programs page to cache program data

---

## Test 1: Crisis Resources Offline Access

**Purpose:** Verify youth can access crisis support when offline

### Steps:
1. [ ] While online, navigate to crisis resources (Get Help button)
2. [ ] Confirm crisis hotline numbers display
3. [ ] Enable Airplane Mode on device
4. [ ] Wait 5 seconds for offline detection
5. [ ] Navigate to crisis resources again
6. [ ] Verify crisis hotlines are still visible

### Expected Results:
- [ ] Crisis resources display from cache
- [ ] Phone numbers are tappable/clickable
- [ ] Offline indicator appears in UI

### Pass/Fail: ______

---

## Test 2: Program Discovery Offline

**Purpose:** Verify cached programs remain accessible

### Steps:
1. [ ] While online, browse Programs page
2. [ ] Open 2-3 individual program details
3. [ ] Enable Airplane Mode
4. [ ] Return to Programs list
5. [ ] Attempt to open previously viewed programs

### Expected Results:
- [ ] Programs list displays from cache
- [ ] Previously viewed program details accessible
- [ ] "Offline" indicator visible
- [ ] Cannot load new programs not in cache

### Pass/Fail: ______

---

## Test 3: Mood Check-in Offline Queue

**Purpose:** Verify check-ins queue when offline and sync when reconnected

### Steps:
1. [ ] Enable Airplane Mode
2. [ ] Navigate to daily check-in
3. [ ] Select mood level (1-6)
4. [ ] Select wellness dimensions
5. [ ] Submit check-in
6. [ ] Note: Confirm pending sync indicator appears
7. [ ] Disable Airplane Mode (reconnect)
8. [ ] Wait 30 seconds for background sync
9. [ ] Verify check-in appears in history

### Expected Results:
- [ ] Check-in form works offline
- [ ] Pending sync indicator shows
- [ ] Check-in syncs when online
- [ ] No data loss

### Pass/Fail: ______

---

## Test 4: Network Transition Handling

**Purpose:** Verify smooth transition between online/offline states

### Steps:
1. [ ] Start with app open and online
2. [ ] Toggle Airplane Mode ON
3. [ ] Verify offline indicator appears within 3 seconds
4. [ ] Toggle Airplane Mode OFF
5. [ ] Verify online status restores within 5 seconds
6. [ ] Repeat 3 times rapidly

### Expected Results:
- [ ] Status transitions smoothly
- [ ] No app crashes
- [ ] No stuck loading states
- [ ] Pending data syncs on reconnect

### Pass/Fail: ______

---

## Test 5: PWA Install and Offline Launch

**Purpose:** Verify installed PWA works from cold start offline

### Steps:
1. [ ] Install PWA to home screen (if not done)
2. [ ] Force close the app completely
3. [ ] Enable Airplane Mode
4. [ ] Launch app from home screen icon
5. [ ] Navigate within app

### Expected Results:
- [ ] App launches successfully
- [ ] Cached pages display
- [ ] Offline indicator shows
- [ ] Core navigation works

### Pass/Fail: ______

---

## Test 6: Daily Quote Offline

**Purpose:** Verify daily affirmation displays when offline

### Steps:
1. [ ] While online, view home page with daily quote
2. [ ] Enable Airplane Mode
3. [ ] Refresh/reload the home page
4. [ ] Check if quote displays

### Expected Results:
- [ ] Quote displays from cache OR
- [ ] Graceful fallback message appears
- [ ] No error or blank space

### Pass/Fail: ______

---

## Summary

| Test | Status | Notes |
|------|--------|-------|
| Crisis Resources Offline | | |
| Program Discovery Offline | | |
| Mood Check-in Queue | | |
| Network Transition | | |
| PWA Cold Start | | |
| Daily Quote Offline | | |

**Overall Offline Readiness:** [ ] PASS / [ ] FAIL

**Tester:** _________________ **Date:** _________________

---

## Troubleshooting

### If tests fail:

1. **Cache not populated:** Ensure you browsed pages while online first
2. **Service worker not active:** Check Chrome DevTools > Application > Service Workers
3. **IndexedDB issues:** Clear site data and re-test
4. **iOS Safari limitations:** PWA offline support is limited on iOS < 16.4

### Developer Notes

- PWA caches: `/api/programs`, `/api/events`, `/api/crisis`, `/api/quotes`
- Service worker: Workbox with StaleWhileRevalidate strategy
- Offline storage: IndexedDB via `idb` library
- Sync indicator component: `src/components/OfflineSyncIndicator.tsx`
