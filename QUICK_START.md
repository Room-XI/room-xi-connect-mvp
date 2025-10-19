# Room XI Connect v2.0 - Quick Start Deployment Guide

**⏱️ Total Time:** 1.5 - 2.5 hours  
**🎯 Goal:** Deploy v2.0 backend components and get the platform running

---

## Prerequisites Checklist

Before you begin, ensure you have:

- [ ] Supabase account with project created
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Git repository cloned locally
- [ ] Node.js 18+ installed
- [ ] Credit card for external services (SendGrid, Upstash)

---

## Step 1: Set Up External Services (15 minutes)

### SendGrid (Email Service)
1. Go to https://signup.sendgrid.com/
2. Create free account (or paid plan for production)
3. Verify your sender email address
4. Generate API key: Settings → API Keys → Create API Key
5. Save the API key (you'll need it later)

**Cost:** Free tier available, ~$15/month for production

### Upstash Redis (Rate Limiting)
1. Go to https://console.upstash.com/
2. Create free account
3. Create new Redis database (select region closest to your users)
4. Copy REST URL and REST Token from database details
5. Save both values (you'll need them later)

**Cost:** Free tier available, ~$10/month for production

---

## Step 2: Configure Environment (10 minutes)

### Create .env File
```bash
cd room-xi-connect-mvp
cp .env.example .env
```

### Fill in .env File
Open `.env` and fill in these values:

```bash
# Supabase (get from https://app.supabase.com/project/_/settings/api)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# SendGrid (from Step 1)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM=consent@yourdomain.com  # Must be verified in SendGrid

# Upstash Redis (from Step 1)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here

# Application URL
APP_URL=https://yourdomain.com  # Or http://localhost:5173 for dev
VITE_APP_URL=http://localhost:5173
```

### Link Supabase Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Get your project ref from Supabase Dashboard → Settings → General

---

## Step 3: Backup Database (5 minutes)

**⚠️ CRITICAL: Always backup before migration!**

1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Click "Create Backup"
4. Wait for backup to complete
5. Download backup file for safekeeping

---

## Step 4: Deploy Backend (10 minutes)

### Option A: Automated (Recommended)
```bash
./deploy-v2.sh
```

The script will:
- ✅ Generate encryption keys
- ✅ Store secrets in Supabase Vault
- ✅ Apply database migration
- ✅ Deploy edge functions
- ✅ Verify deployment

### Option B: Manual Steps
```bash
# Generate and store encryption keys
supabase secrets set app.case_notes_encryption_key="$(openssl rand -base64 32)"
supabase secrets set app.xid_pepper="$(openssl rand -hex 64)"

# Set environment variables
supabase secrets set SENDGRID_API_KEY="YOUR_KEY"
supabase secrets set SENDGRID_FROM="YOUR_EMAIL"
supabase secrets set UPSTASH_REDIS_REST_URL="YOUR_URL"
supabase secrets set UPSTASH_REDIS_REST_TOKEN="YOUR_TOKEN"
supabase secrets set APP_URL="YOUR_URL"

# Apply database migration
supabase db push

# Deploy edge functions
supabase functions deploy referral-create
supabase functions deploy send-consent-email
supabase functions deploy verify-consent
supabase functions deploy xid-create
```

---

## Step 5: Seed Initial Data (10 minutes)

### Open Supabase SQL Editor
1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Open `SEED_DATA.sql` file
4. Copy the SQL commands

### Create Organization
```sql
-- Insert Room XI organization
INSERT INTO organizations (name, type, contact_email, website, active)
VALUES (
  'Room XI',
  'nonprofit',
  'hello@roomxi.org',
  'https://roomxi.org',
  true
)
RETURNING id;
```

**📝 Save the returned ID!** You'll need it for the next step.

### Add Admin User
```sql
-- Replace YOUR_ORG_ID and YOUR_USER_ID
INSERT INTO org_members (org_id, user_id, role, permissions, active)
VALUES (
  'YOUR_ORG_ID',  -- ID from previous step
  'YOUR_USER_ID',  -- Get from auth.users table
  'org_admin',
  '{"view_referrals": true, "create_referrals": true, "manage_programs": true}',
  true
);
```

### Verify Coping Skills
```sql
-- Should return 30+
SELECT COUNT(*) FROM coping_skills;
```

---

## Step 6: Test Locally (20 minutes)

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Test Features

**✅ Journal Page** (http://localhost:5173/journal)
- Can you see the journal page?
- Can you create a new entry?
- Does it save to the database?

**✅ Org Dashboard** (http://localhost:5173/org/dashboard)
- Does the dashboard load?
- Can you see organization stats?

**✅ Home Page**
- Do you see "Quick Actions" section?
- Does the Journal link work?

**✅ Browser Console**
- Are there any errors?
- Any React Router warnings?

---

## Step 7: Deploy to Production (15 minutes)

### Build Frontend
```bash
npm run build
```

Should complete without errors.

### Deploy to Vercel
```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy
vercel --prod
```

### Set Vercel Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL` (your production URL)

### Test Production
Visit your production URL and test:
- [ ] Journal page works
- [ ] Org dashboard works
- [ ] No console errors
- [ ] SSL certificate valid

---

## Step 8: Monitor (48 hours)

### Check Logs
- **Supabase Logs:** Dashboard → Logs
- **Edge Function Logs:** Dashboard → Edge Functions → Logs
- **SendGrid Delivery:** SendGrid Dashboard → Activity

### Watch For
- Database errors
- Edge function errors
- Email delivery failures
- Performance issues

---

## Troubleshooting

### "Table does not exist" Error
**Cause:** Migration not applied  
**Fix:** Run `supabase db push`

### "Invalid API key" Error (SendGrid)
**Cause:** API key not set or incorrect  
**Fix:** Verify `SENDGRID_API_KEY` in Supabase secrets

### Journal Won't Save
**Cause:** RLS policies blocking access  
**Fix:** Ensure user is authenticated and has proper permissions

### Consent Emails Not Sending
**Cause:** SendGrid sender not verified  
**Fix:** Verify sender email in SendGrid Dashboard

### "Function not found" Error
**Cause:** Edge functions not deployed  
**Fix:** Run `supabase functions deploy FUNCTION_NAME`

---

## Success Checklist

Your deployment is successful when:

- [x] Database migration applied (11 new tables)
- [x] Edge functions deployed (4 functions)
- [x] Coping skills seeded (30+)
- [x] Journal page works
- [x] Org dashboard works
- [x] Consent emails send successfully
- [x] No console errors
- [x] Production site accessible
- [x] SSL certificate valid
- [x] Performance acceptable (Lighthouse 90+)

---

## Next Steps

### Immediate
1. Create additional organizations
2. Seed more programs
3. Invite team members
4. Test consent workflow end-to-end

### Within 1 Week
1. Train staff on organization dashboard
2. Set up monitoring alerts
3. Review audit logs
4. Gather user feedback

### Within 1 Month
1. Privacy Impact Assessment
2. Legal review of consent workflows
3. Security audit
4. Performance optimization

---

## Support

**Need Help?**
- 📧 Email: hello@roomxi.org
- 📖 Docs: See DEPLOYMENT_CHECKLIST.md for detailed steps
- 🐛 Issues: https://github.com/Room-XI/room-xi-connect-mvp/issues

---

## Resources

- **V2_DEPLOYMENT_GUIDE.md** - Detailed deployment guide
- **DEPLOYMENT_CHECKLIST.md** - Complete checklist
- **CHANGELOG.md** - What's new in v2.0
- **SEED_DATA.sql** - Sample data scripts
- **.env.example** - Environment variable template

---

**🎉 Congratulations on deploying Room XI Connect v2.0!**

**Built with ❤️ by Room XI for youth across Canada**

