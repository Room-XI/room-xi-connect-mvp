# Room XI Connect v2.0 - Deployment Checklist

Use this checklist to ensure a successful deployment of v2.0 backend components.

## Pre-Deployment

### Environment Setup
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Supabase project linked (`supabase link --project-ref YOUR_REF`)
- [ ] `.env` file created from `.env.example`
- [ ] All environment variables filled in `.env`

### External Services
- [ ] SendGrid account created
- [ ] SendGrid API key generated
- [ ] SendGrid sender email verified
- [ ] Upstash Redis account created
- [ ] Upstash Redis database created
- [ ] Upstash REST credentials obtained

### Database Backup
- [ ] Database backup created via Supabase Dashboard
- [ ] Backup downloaded and stored securely
- [ ] Backup tested (optional but recommended)

### Code Review
- [ ] Latest code pulled from repository
- [ ] Migration file reviewed (`supabase/migrations/20241018_edmonton_expansion.sql`)
- [ ] Edge functions reviewed
- [ ] No uncommitted changes in working directory

## Deployment

### Step 1: Generate Encryption Keys
- [ ] Case notes encryption key generated (`openssl rand -base64 32`)
- [ ] XID pepper generated (`openssl rand -hex 64`)
- [ ] Keys stored in Supabase Vault:
  - [ ] `app.case_notes_encryption_key`
  - [ ] `app.xid_pepper`
- [ ] Keys verified with `supabase secrets list`

### Step 2: Set Environment Variables
- [ ] `SENDGRID_API_KEY` set in Supabase secrets
- [ ] `SENDGRID_FROM` set in Supabase secrets
- [ ] `UPSTASH_REDIS_REST_URL` set in Supabase secrets
- [ ] `UPSTASH_REDIS_REST_TOKEN` set in Supabase secrets
- [ ] `APP_URL` set in Supabase secrets
- [ ] All variables verified with `supabase secrets list`

### Step 3: Apply Database Migration
- [ ] Migration file exists (`supabase/migrations/20241018_edmonton_expansion.sql`)
- [ ] Migration applied (`supabase db push`)
- [ ] No errors in migration output
- [ ] Tables created (verify in Supabase Dashboard):
  - [ ] `organizations`
  - [ ] `org_members`
  - [ ] `journal_entries`
  - [ ] `coping_skills`
  - [ ] `consents`
  - [ ] `referrals`
  - [ ] `case_notes`
  - [ ] `guardian_verifications`
  - [ ] `program_outcomes`
- [ ] `youth_profiles` table enhanced with new columns
- [ ] Coping skills seeded (verify: `SELECT COUNT(*) FROM coping_skills;` should return 30+)

### Step 4: Deploy Edge Functions
- [ ] `referral-create` deployed (`supabase functions deploy referral-create`)
- [ ] `send-consent-email` deployed (`supabase functions deploy send-consent-email`)
- [ ] `verify-consent` deployed (`supabase functions deploy verify-consent`)
- [ ] `xid-create` redeployed (`supabase functions deploy xid-create`)
- [ ] All functions listed (`supabase functions list`)
- [ ] No deployment errors

### Step 5: Seed Initial Data
- [ ] Room XI organization created:
  ```sql
  INSERT INTO organizations (name, type, contact_email, active)
  VALUES ('Room XI', 'nonprofit', 'hello@roomxi.org', true)
  RETURNING id;
  ```
- [ ] Admin users added to organization:
  ```sql
  INSERT INTO org_members (org_id, user_id, role)
  VALUES ('org-id', 'user-id', 'org_admin');
  ```
- [ ] Edmonton programs seeded (optional, see V2_DEPLOYMENT_GUIDE.md)
- [ ] Coping skills verified (should be auto-seeded)

## Testing

### Backend Testing
- [ ] Test XID creation:
  ```bash
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/xid-create \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"profile_id": "test-id"}'
  ```
- [ ] Verify XID format: `RXI-XXXXXX`
- [ ] Test referral creation (requires authenticated user)
- [ ] Test consent email sending (requires guardian email)
- [ ] Verify emails received in SendGrid dashboard

### Database Testing
- [ ] RLS policies working (test unauthorized access)
- [ ] Triggers working (test consent cascade)
- [ ] Functions working (test database functions)
- [ ] Constraints enforced (test invalid data)

### Frontend Testing (Local)
- [ ] Install dependencies (`npm install`)
- [ ] Start dev server (`npm run dev`)
- [ ] Test journal page (`/journal`)
  - [ ] "Write Alone" mode works
  - [ ] "Talk with Ximi" mode works (if OpenAI configured)
  - [ ] Journal entries save to database
  - [ ] Journal history displays correctly
- [ ] Test org dashboard (`/org/dashboard`)
  - [ ] Dashboard loads without errors
  - [ ] Stats display correctly
  - [ ] Referrals list works
- [ ] Test consent verification (`/verify-consent/:token`)
  - [ ] Page loads without errors
  - [ ] Age verification works
  - [ ] Consent grant/deny works
- [ ] Test Quick Actions on home page
  - [ ] Journal link appears
  - [ ] Link navigates to journal page
- [ ] No console errors in browser
- [ ] No React Router warnings

## Production Deployment

### Frontend Build
- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] No build warnings (or acceptable warnings documented)
- [ ] Build output size reasonable (<500KB gzipped)

### Vercel Deployment
- [ ] Environment variables set in Vercel:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_APP_URL`
  - [ ] `VITE_SENTRY_DSN` (optional)
- [ ] Deploy to production (`vercel --prod`)
- [ ] Deployment successful
- [ ] Production URL accessible

### Production Testing
- [ ] All routes load correctly
- [ ] Journal page works
- [ ] Org dashboard works
- [ ] Consent verification works
- [ ] No console errors
- [ ] No 404 errors
- [ ] SSL certificate valid
- [ ] Performance acceptable (Lighthouse score 90+)

## Post-Deployment

### Monitoring (First 48 Hours)
- [ ] Monitor Supabase logs for errors
- [ ] Monitor Edge Function logs
- [ ] Monitor SendGrid delivery reports
- [ ] Monitor Sentry for frontend errors (if configured)
- [ ] Monitor user feedback/support requests
- [ ] Monitor database performance

### Documentation
- [ ] Update README.md with v2.0 information
- [ ] Update CHANGELOG.md with deployment date
- [ ] Tag release as v2.0 (`git tag -a v2.0 -m "Edmonton Multi-Org Expansion"`)
- [ ] Push tag to GitHub (`git push origin v2.0`)
- [ ] Create GitHub release with changelog

### Communication
- [ ] Notify team of successful deployment
- [ ] Notify partner organizations of new features
- [ ] Update user documentation
- [ ] Announce v2.0 release (if applicable)

## Rollback Plan

If critical issues arise:

### Immediate Actions
- [ ] Revert frontend deployment in Vercel
- [ ] Disable problematic Edge Functions
- [ ] Restore database from backup (if necessary)
- [ ] Notify users of temporary issues

### Database Rollback
```sql
-- Drop new tables (only if absolutely necessary)
DROP TABLE IF EXISTS program_outcomes CASCADE;
DROP TABLE IF EXISTS guardian_verifications CASCADE;
DROP TABLE IF EXISTS case_notes CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS consents CASCADE;
DROP TABLE IF EXISTS coping_skills CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Remove new columns from youth_profiles (if necessary)
ALTER TABLE youth_profiles 
  DROP COLUMN IF EXISTS guardian_name,
  DROP COLUMN IF EXISTS guardian_email,
  -- ... (list all new columns)
```

### Edge Function Rollback
```bash
# Delete deployed functions
supabase functions delete referral-create
supabase functions delete send-consent-email
supabase functions delete verify-consent
```

## Success Criteria

Deployment is successful when:

- [x] All backend components deployed without errors
- [x] All tests passing
- [x] No critical bugs in production
- [x] Performance meets expectations
- [x] Users can access all features
- [x] Monitoring shows healthy metrics

## Notes

- Keep this checklist updated as deployment process evolves
- Document any issues encountered and solutions
- Share learnings with team for future deployments

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Production URL:** _______________  
**Rollback Performed:** Yes / No  
**Issues Encountered:** _______________

---

**Last Updated:** October 19, 2025  
**Version:** 2.0.0

