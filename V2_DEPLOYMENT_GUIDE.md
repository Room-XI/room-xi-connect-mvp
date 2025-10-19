# Room XI Connect v2.0 - Deployment Guide

## ✅ What's Been Integrated

This deployment guide covers the **v2.0 Edmonton Expansion** features that have been integrated into the codebase.

### Frontend Integration ✅
- [x] Router updated with new routes (`/journal`, `/verify-consent/:token`, `/org/dashboard`)
- [x] React Router v7 future flags enabled (warnings fixed)
- [x] QuickActions component added to Home page
- [x] Journal component ready
- [x] Guardian consent verification page ready
- [x] Organization dashboard ready
- [x] Zod validation library installed
- [x] All imports fixed to use `@/` alias

### Backend Files Created (Not Yet Deployed) ⏳
- [ ] Database migration (`supabase/migrations/20241018_edmonton_expansion.sql`)
- [ ] Edge Functions (`referral-create`, `send-consent-email`, `verify-consent`)
- [ ] Enhanced `xid-create` function
- [ ] Validation schemas (`src/lib/validation.ts`)
- [ ] Encryption utilities (`src/lib/encryption.ts`)

---

## 🚀 Deployment Steps

### Phase 1: Test Frontend Integration (Local)

```bash
# Navigate to project
cd /home/ubuntu/room-xi-connect-mvp

# Install dependencies (already done)
npm install

# Start development server
npm run dev

# Test new routes:
# - http://localhost:5173/journal
# - http://localhost:5173/org/dashboard
# - Home page should show "Quick Actions" with Journal link
```

**Expected Results:**
- ✅ No React Router warnings
- ✅ Journal page loads (but won't save entries yet - database not migrated)
- ✅ Org Dashboard loads (but shows no data - database not migrated)
- ✅ Home page shows "Quick Actions" section with Journal link

---

### Phase 2: Apply Database Migration (Supabase)

**⚠️ IMPORTANT: Backup your database first!**

```bash
# Connect to your Supabase project
supabase link --project-ref your-project-ref

# Review the migration
cat supabase/migrations/20241018_edmonton_expansion.sql

# Apply migration
supabase db push
```

**What This Creates:**
- 11 new tables (organizations, org_members, consents, referrals, case_notes, journal_entries, coping_skills, etc.)
- Enhanced youth_profiles table with guardian fields
- 40+ Row Level Security policies
- 8 database functions
- Triggers for consent cascade and referral updates
- 30+ coping skills seeded automatically

**Verify Migration:**
```sql
-- In Supabase SQL Editor, run:
SELECT COUNT(*) FROM coping_skills; -- Should return 30+
SELECT COUNT(*) FROM organizations; -- Should return 0 (empty, ready for data)
```

---

### Phase 3: Set Up Environment Variables

#### Required for v2.0 Features:

**Generate Encryption Keys:**
```bash
# Case notes encryption key
CASE_NOTES_KEY=$(openssl rand -base64 32)
echo "CASE_NOTES_KEY: $CASE_NOTES_KEY"

# XID pepper (for enhanced security)
XID_PEPPER=$(openssl rand -hex 64)
echo "XID_PEPPER: $XID_PEPPER"
```

**Store in Supabase Vault:**
```bash
supabase secrets set app.case_notes_encryption_key="$CASE_NOTES_KEY"
supabase secrets set app.xid_pepper="$XID_PEPPER"
```

**Add to Vercel (for production):**
```bash
# In Vercel Dashboard > Settings > Environment Variables, add:
SENDGRID_API_KEY=SG.your_sendgrid_key_here
SENDGRID_FROM=consent@roomxiconnect.org
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
APP_URL=https://roomxiconnect.org
```

**Local Development (.env):**
```bash
# Add to .env file:
VITE_APP_URL=http://localhost:5173
```

---

### Phase 4: Deploy Edge Functions

```bash
# Deploy new functions
supabase functions deploy referral-create
supabase functions deploy send-consent-email
supabase functions deploy verify-consent

# Redeploy enhanced xid-create
supabase functions deploy xid-create

# Verify deployment
supabase functions list
```

**Test Edge Functions:**
```bash
# Test xid-create (should work immediately)
curl -X POST https://your-project.supabase.co/functions/v1/xid-create \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"profile_id": "test-profile-id"}'

# Should return: {"xid": "RXI-XXXXXX"}
```

---

### Phase 5: Seed Initial Data

```sql
-- In Supabase SQL Editor:

-- 1. Create Room XI organization
INSERT INTO organizations (name, type, contact_email, active)
VALUES ('Room XI', 'nonprofit', 'hello@roomxi.org', true)
RETURNING id;

-- Note the returned ID, then add yourself as admin:
INSERT INTO org_members (org_id, user_id, role)
VALUES ('org-id-from-above', 'your-user-id', 'admin');

-- 2. Seed Edmonton programs (example)
INSERT INTO programs (
  title, description, tags, free, indoor, outdoor,
  location_name, address, lat, lng, organizer, next_start
) VALUES
('Youth Drop-In', 'Safe space for youth ages 13-25', ARRAY['social', 'mental_health'], true, true, false, 'Room XI', '123 Main St, Edmonton, AB', '53.5461', '-113.4938', 'Room XI', NOW() + INTERVAL '1 day'),
('Art Therapy Workshop', 'Express yourself through creative art', ARRAY['mental_health', 'creative'], true, true, false, 'Community Arts Center', '456 Jasper Ave, Edmonton, AB', '53.5444', '-113.4909', 'Edmonton Arts Council', NOW() + INTERVAL '3 days'),
('Basketball Drop-In', 'Casual basketball games every Thursday', ARRAY['recreation', 'sports'], true, true, false, 'Terwillegar Rec Centre', '2051 Leger Rd NW, Edmonton, AB', '53.4584', '-113.5542', 'City of Edmonton', NOW() + INTERVAL '2 days');

-- 3. Verify coping skills were auto-seeded
SELECT COUNT(*) FROM coping_skills; -- Should be 30+
```

---

### Phase 6: Deploy Frontend

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to your hosting provider
```

---

### Phase 7: Post-Deployment Testing

**Test Checklist:**

#### Youth Features:
- [ ] Journal page loads and saves entries
- [ ] "Write Alone" mode works
- [ ] "Talk with Ximi" mode works (requires OpenAI key)
- [ ] Journal entries appear in history
- [ ] Quick Actions on Home page link to Journal

#### Organization Features:
- [ ] Org Dashboard loads with stats
- [ ] Can create referrals
- [ ] Can view case notes
- [ ] Can manage programs

#### Guardian Features:
- [ ] Consent email sends (requires SendGrid)
- [ ] Consent verification link works
- [ ] Age verification (18+) works
- [ ] Consent status updates in database

#### Security:
- [ ] RLS policies prevent unauthorized access
- [ ] Case notes are encrypted
- [ ] Input validation works (Zod schemas)
- [ ] Rate limiting works (requires Upstash)

---

## 🔧 Troubleshooting

### Issue: Journal won't save entries
**Cause:** Database migration not applied  
**Fix:** Run `supabase db push` to apply migration

### Issue: "Table 'journal_entries' does not exist"
**Cause:** Migration not applied  
**Fix:** Apply migration in Phase 2

### Issue: Org Dashboard shows no data
**Cause:** No organizations seeded  
**Fix:** Run seed SQL in Phase 5

### Issue: Consent emails not sending
**Cause:** SendGrid not configured  
**Fix:** Add SENDGRID_API_KEY to environment variables

### Issue: XID generation fails
**Cause:** XID pepper not set  
**Fix:** Add app.xid_pepper to Supabase secrets

---

## 📋 What's NOT Yet Integrated

These features are in the codebase but require additional setup:

### Requires External Services:
- **SendGrid** ($15/month) - For guardian consent emails
- **Upstash Redis** ($10/month) - For rate limiting
- **OpenAI API** - For Ximi AI conversations in journal

### Requires Manual Configuration:
- **Privacy Impact Assessment** - Legal requirement before collecting guardian data
- **Legal review** - Consent workflows and data sharing agreements
- **Staff training** - How to use organization dashboard
- **Crisis protocol** - Integration with crisis response team

### Future Enhancements:
- Map view with program pins (Leaflet integration)
- CSV export for funders
- Advanced analytics dashboard
- 211 Alberta integration
- Alberta Digital ID integration

---

## 🎯 Success Criteria

Your v2.0 deployment is successful when:

1. ✅ Youth can create journal entries
2. ✅ Organizations can view their dashboard
3. ✅ Guardian consent verification works
4. ✅ All RLS policies prevent unauthorized access
5. ✅ No console errors in browser
6. ✅ All routes load without 404 errors
7. ✅ Database has seeded data (programs, coping skills, orgs)

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs for database errors
3. Check Edge Function logs in Supabase Dashboard
4. Review this deployment guide
5. Contact hello@roomxi.org for support

---

**Last Updated:** October 18, 2025  
**Version:** 2.0.0  
**Status:** Frontend Integrated ✅ | Backend Ready for Deployment ⏳

