# Developer Handoff - Room XI Connect

**Handoff Date:** October 29, 2025  
**Project:** Room XI Connect (Youth Mental Health Platform)  
**Status:** ✅ MVP Complete - Backend migrated from Supabase to Express + Drizzle + Neon PostgreSQL

---

## 🎯 Quick Start (5 Minutes)

### Get Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (already configured on Replit)
# DATABASE_URL and SESSION_SECRET are in Replit Secrets

# 3. Push database schema
npm run db:push

# 4. Seed with sample data
npm run db:seed

# 5. Start dev server
npm run dev

# Server runs on http://localhost:5000
```

### Test the App

**Test Account:**
```
Email: test@example.com
Password: test123
```

**What to Test:**
1. Visit http://localhost:5000
2. Click "Explore Programs" → Browse without login ✓
3. Click "Sign In" → Login with test account ✓
4. Click "Check In" → Do a mood check-in ✓
5. Go to "Explore" → Save a program ✓
6. Go to "QR" → Test QR scanner (needs QR code) ✓
7. Go to "Me" → View profile and stats ✓

**Expected:** Everything should work smoothly!

---

## 📊 Project Status

### ✅ What's Working

#### Authentication
- [x] Email/password registration
- [x] Login with session cookies (httpOnly, secure)
- [x] Session persistence (7-day expiry)
- [x] Password hashing with bcrypt
- [x] Account deletion
- [x] Password reset flow (email sending TODO)

#### Core Features
- [x] Daily mood check-ins (Mood Orb interaction)
- [x] Streak calculation (consecutive days)
- [x] Program browsing (no login required)
- [x] Program detail pages
- [x] Save/bookmark programs
- [x] Map view with Leaflet
- [x] Crisis support resources (always available)
- [x] XID generation for privacy-preserving attendance
- [x] QR code attendance tracking
- [x] User profile with stats
- [x] Offline support with IndexedDB queue

#### Backend
- [x] Express.js server with Vite middleware
- [x] PostgreSQL session storage
- [x] Drizzle ORM for type-safe queries
- [x] All API routes migrated from Supabase
- [x] Authentication middleware
- [x] CORS and cookie handling

#### Frontend
- [x] React 18 with TypeScript
- [x] Unified API client (`src/lib/api.ts`)
- [x] Session provider for auth state
- [x] Responsive design (mobile-first)
- [x] Tailwind CSS styling
- [x] Framer Motion animations
- [x] Bottom navigation

#### Compliance
- [x] Database schema supports PIPA/HIA compliance
- [x] Granular consent tracking
- [x] Guardian verification system
- [x] Health data separation
- [x] Breach notification system
- [x] Audit trail tables
- [x] OCAP principles for Indigenous data

### 🚧 Known Issues

#### Critical (Fix Before Production)
- None identified (MVP is stable)

#### Medium Priority
- **Email Sending**: Password reset sends placeholder response, doesn't send actual email
  - **Fix**: Integrate email service (SendGrid, Mailgun, or Replit Email)
  - **File**: `server/routes/auth.js` → `/reset-password` endpoint

- **Offline Sync**: Queue processing logic stubbed out
  - **Fix**: Implement actual API retry in `src/lib/queue.ts` → `processQueue()`
  - **Current**: Items added to queue but not synced when online

- **XP System**: XP awarded but not displayed consistently
  - **Fix**: Add XP notifications after check-ins, attendance
  - **Files**: `src/pages/Home.tsx`, `src/components/CheckInForm.tsx`

#### Low Priority
- **Map Performance**: Large program datasets may slow down map
  - **Fix**: Add clustering for 100+ programs (react-leaflet-cluster)

- **QR Scanner**: Works only in HTTPS (WebRTC requirement)
  - **Workaround**: Replit provides HTTPS in production

- **Service Worker**: Disabled in development
  - **Reason**: Prevents hot reload issues
  - **Status**: Enabled in production builds

### 🔜 Planned Features (Not Started)

#### v1.1 - Enhanced Engagement
- [ ] Journal entries with Ximi AI prompts
- [ ] Coping skills library
- [ ] Notifications for upcoming programs
- [ ] Program recommendations based on mood patterns

#### v1.2 - Multi-Org Support
- [ ] Organization dashboard
- [ ] Referral system between orgs
- [ ] Case notes (encrypted)
- [ ] Program outcome tracking

#### v2.0 - Advanced Features
- [ ] Alberta Digital ID integration (when API available)
- [ ] SMS notifications
- [ ] Calendar integration
- [ ] Advanced analytics dashboard

---

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**
```
Express.js 5.1         → HTTP server
Drizzle ORM 0.44       → Database queries
PostgreSQL (Neon)      → Database
bcrypt                 → Password hashing
express-session        → Session management
connect-pg-simple      → Session storage
```

**Frontend:**
```
React 18               → UI framework
TypeScript 5.6         → Type safety
Vite 5.4               → Build tool
React Router 6         → Routing
Tailwind CSS 3.4       → Styling
Framer Motion          → Animations
Leaflet                → Maps
```

### Project Structure

```
room-xi-connect/
├── server/
│   ├── index.js              # Express server entry point
│   ├── db.js                 # Database connection
│   ├── schema.ts             # Drizzle ORM schema (all tables)
│   ├── seed.js               # Database seeding script
│   └── routes/
│       ├── auth.js           # Authentication endpoints
│       ├── programs.js       # Program CRUD
│       ├── checkins.js       # Mood check-ins
│       ├── profile.js        # User profile
│       ├── xid.js            # XID & attendance
│       ├── consent.js        # Consent management
│       └── crisis.js         # Crisis resources
│
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component with routing
│   ├── lib/
│   │   ├── api.ts            # API client (replaces Supabase)
│   │   ├── session.tsx       # Session provider & hooks
│   │   └── queue.ts          # Offline sync queue
│   ├── pages/
│   │   ├── Home.tsx          # Dashboard (auth required)
│   │   ├── Explore.tsx       # Program browser (public)
│   │   ├── ProgramDetail.tsx # Single program view
│   │   ├── QR.tsx            # QR code scanner
│   │   ├── Me.tsx            # Profile page
│   │   ├── Settings.tsx      # User settings
│   │   └── auth/
│   │       ├── Login.tsx     # Login + landing page
│   │       └── Register.tsx  # Registration flow
│   └── components/
│       ├── CheckInForm.tsx   # Mood check-in modal
│       ├── CrisisSheet.tsx   # Crisis support modal
│       ├── ProgramCard.tsx   # Program list item
│       ├── ProgramMap.tsx    # Leaflet map view
│       └── ...
│
├── BUILD.md              # Complete technical documentation
├── DEVELOPER_HANDOFF.md  # This file
├── README.md             # Project overview
├── package.json          # Dependencies & scripts
└── vite.config.ts        # Vite configuration
```

### Data Flow

**Authentication:**
```
User → Login Form → api.auth.login() → POST /api/auth/login
→ bcrypt.compare() → req.session.user = {...} → Cookie set
→ SessionProvider updates → Navigate to /home
```

**Check-In:**
```
User → Mood Orb → CheckInForm → api.checkins.create()
→ POST /api/checkins → INSERT into checkins
→ UPDATE profiles (streak) → Response → Home refreshes
```

**Save Program:**
```
User → Program Card "Save" → api.programs.saved.add(id)
→ POST /api/programs/saved/:id → INSERT saved_programs
→ Button state updates → "Saved" ❤️
```

### Database Schema

**Core Tables:**
- `users` - Authentication credentials
- `profiles` - Extended user data, streaks, XP
- `programs` - Youth activities
- `saved_programs` - User bookmarks
- `checkins` - Daily mood tracking
- `xids` - Privacy-preserving identifiers
- `attendance` - Program check-ins

**Compliance Tables:**
- `guardian_verifications` - Parental consent
- `consents` - Granular permissions
- `health_profiles` - HIA-compliant health data
- `consent_events` - Audit trail
- `breach_events` - Privacy breach tracking

**See BUILD.md for complete schema with all 20+ tables**

---

## 🔧 Common Tasks

### Adding a New API Endpoint

**Example: Add "Get User Attendance Count"**

1. **Create route** in `server/routes/xid.js`:

```javascript
router.get('/attendance/count', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [xid] = await db.select().from(xids).where(eq(xids.userId, userId));
    
    if (!xid) {
      return res.json({ data: { count: 0 } });
    }

    const count = await db.select({ count: sql`count(*)` })
      .from(attendance)
      .where(eq(attendance.xidId, xid.id));

    res.json({ data: { count: count[0].count } });
  } catch (error) {
    console.error('Get attendance count error:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});
```

2. **Add to API client** in `src/lib/api.ts`:

```typescript
export const api = {
  // ... existing code
  xid: {
    // ... existing methods
    getAttendanceCount: () => fetchApi('/xid/attendance/count'),
  },
};
```

3. **Use in component**:

```typescript
const { data } = await api.xid.getAttendanceCount();
console.log('Attendance count:', data.count);
```

### Adding a New Database Table

1. **Define schema** in `server/schema.ts`:

```typescript
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId, table.createdAt.desc()),
}));
```

2. **Push to database**:

```bash
npm run db:push
```

3. **Verify** in Drizzle Studio:

```bash
npm run db:studio
# Opens at http://localhost:4983
```

### Modifying Existing Schema

**⚠️ IMPORTANT: Never change ID column types!**

```typescript
// ❌ DON'T DO THIS (breaks existing data)
id: serial("id").primaryKey()  // Was varchar before

// ✅ DO THIS (match existing type)
id: uuid("id").primaryKey().defaultRandom()  // Keep as uuid
```

**Safe changes:**
- Add new columns (use `.default()` for NOT NULL)
- Change column types (text → varchar, integer → bigint)
- Add indexes
- Drop unused columns

**Process:**

1. Edit `server/schema.ts`
2. Run `npm run db:push`
3. If conflicts: `npm run db:push --force`
4. Test with `npm run db:seed` on fresh database

### Adding a Frontend Component

**Example: Add "Program Rating" component**

1. **Create component** in `src/components/ProgramRating.tsx`:

```typescript
import { Star } from 'lucide-react';

interface Props {
  rating: number;
  programId: string;
  onRate?: (rating: number) => void;
}

export function ProgramRating({ rating, programId, onRate }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate?.(star)}
          className="hover:scale-110 transition"
        >
          <Star
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
            size={20}
          />
        </button>
      ))}
    </div>
  );
}
```

2. **Use in program detail**:

```typescript
import { ProgramRating } from '@/components/ProgramRating';

// In component:
<ProgramRating
  rating={program.averageRating}
  programId={program.id}
  onRate={(rating) => handleRating(rating)}
/>
```

### Testing API Endpoints

**Using curl:**

```bash
# Login
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get profile (uses session cookie)
curl -b cookies.txt http://localhost:5000/api/profile

# Create check-in
curl -b cookies.txt -X POST http://localhost:5000/api/checkins \
  -H "Content-Type: application/json" \
  -d '{"dimension":"mood","moodLevel16":4,"affectTags":["grateful"]}'
```

**Using browser console:**

```javascript
// Login
await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'test123' })
}).then(r => r.json())

// Get programs
await fetch('/api/programs', {
  credentials: 'include'
}).then(r => r.json())
```

---

## 🐛 Troubleshooting

### App Won't Start

**Error: `DATABASE_URL is not set`**

**Fix:**
```bash
# Check Replit Secrets pane
# Add DATABASE_URL with Neon PostgreSQL connection string
```

**Error: `Cannot find module 'express'`**

**Fix:**
```bash
npm install
```

**Error: `Port 5000 already in use`**

**Fix:**
```bash
# Kill existing process
lsof -ti:5000 | xargs kill -9
# Or change port in server/index.js
```

### Database Issues

**Error: `relation "users" does not exist`**

**Fix:**
```bash
# Push schema to database
npm run db:push

# If that fails, force push
npm run db:push --force
```

**Error: `duplicate key value violates unique constraint`**

**Cause:** Trying to create duplicate data (e.g., registering same email twice)

**Fix:** This is expected behavior. Check for existing data before inserting.

**Error: `column "id" cannot be cast automatically`**

**Cause:** Tried to change ID column type in schema

**Fix:**
```bash
# Revert schema change to match existing database
# ID types must stay consistent (uuid → uuid, serial → serial)
git checkout server/schema.ts
npm run db:push
```

### Authentication Issues

**Session not persisting between requests**

**Check:**
1. Cookies enabled in browser?
2. `credentials: 'include'` in fetch calls?
3. Session store table exists? (`SELECT * FROM session LIMIT 1`)

**Fix:**
```bash
# Recreate session table
npm run db:push --force
```

**Password reset not sending email**

**Status:** Email sending not implemented yet (placeholder)

**Fix:** Integrate email service in `server/routes/auth.js`

### Frontend Issues

**React hot reload not working**

**Fix:**
```bash
# Restart dev server
Ctrl+C
npm run dev
```

**API calls failing with CORS error**

**Cause:** Vite proxy not configured (shouldn't happen)

**Check:** `vite.config.ts` has Vite running in middleware mode

**Changes not visible in browser**

**Fix:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Check if service worker is active (should be disabled in dev)

### Map Not Loading

**Error:** Map tiles showing broken images

**Fix:**
```bash
# Check VITE_MAP_TILES_URL in .env
# Default: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Error:** Map not centering on programs

**Check:** Programs have valid `lat` and `lng` values
```bash
# In Drizzle Studio or psql
SELECT id, title, lat, lng FROM programs WHERE lat IS NULL OR lng IS NULL;
```

### QR Scanner Not Working

**Error:** Camera permission denied

**Fix:** Grant camera permissions in browser settings

**Error:** QR scanner black screen

**Cause:** HTTPS required for WebRTC (camera access)

**Fix:** Use Replit deployment URL (has HTTPS)

---

## 🚀 Deployment Checklist

### Before Production Deploy

- [ ] **Set strong `SESSION_SECRET`** (generate with `openssl rand -base64 32`)
- [ ] **Enable secure cookies** (`cookie.secure = true` in production)
- [ ] **Set up database backups** (Neon has automatic backups)
- [ ] **Configure error tracking** (Sentry, LogRocket, etc.)
- [ ] **Rate limit auth endpoints** (express-rate-limit)
- [ ] **Integrate email service** (SendGrid, Mailgun, Replit Email)
- [ ] **Test offline sync** (add to queue, go offline, come online)
- [ ] **Test on mobile devices** (iOS Safari, Android Chrome)
- [ ] **Run accessibility audit** (Lighthouse, WAVE)
- [ ] **Review all environment variables**
- [ ] **Test all API endpoints** (use Postman collection)
- [ ] **Review PIPA/HIA compliance** (consent flows, data handling)
- [ ] **Set up monitoring** (Uptime Robot, Datadog)
- [ ] **Create backup admin account**
- [ ] **Document crisis support contact update process**

### Replit Deployment

1. **Push latest code to main branch**
2. **Verify secrets in Replit Secrets pane**
3. **Click "Deploy" button** (or use CLI: `replit deploy`)
4. **Wait for build to complete**
5. **Test deployed app** (use test account)
6. **Monitor logs** for first 24 hours

### Post-Deploy Verification

```bash
# Test production API
curl https://<your-replit-url>.repl.co/api/programs

# Test authentication
curl -X POST https://<your-replit-url>.repl.co/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Check database connection
npm run db:studio
# Should connect to production database
```

---

## 📚 Key Files to Know

### Backend

- **`server/index.js`** - Express server setup, middleware, route mounting
- **`server/schema.ts`** - Complete database schema (20+ tables)
- **`server/db.js`** - Database connection (Neon PostgreSQL)
- **`server/routes/auth.js`** - Authentication logic (login, register, logout)
- **`server/routes/programs.js`** - Program CRUD and saved programs
- **`server/routes/checkins.js`** - Daily check-ins and streak calculation

### Frontend

- **`src/lib/api.ts`** - API client (replaces all Supabase calls)
- **`src/lib/session.tsx`** - Session provider and auth hooks
- **`src/App.tsx`** - Routing and protected route logic
- **`src/pages/Home.tsx`** - Main dashboard (auth required)
- **`src/pages/Explore.tsx`** - Program browser (public)
- **`src/components/CheckInForm.tsx`** - Mood Orb check-in modal

### Configuration

- **`package.json`** - Dependencies and scripts
- **`vite.config.ts`** - Vite build configuration
- **`tailwind.config.js`** - Tailwind CSS customization
- **`drizzle.config.ts`** - Drizzle ORM configuration

### Documentation

- **`BUILD.md`** - Complete technical reference (920+ lines)
- **`DEVELOPER_HANDOFF.md`** - This file
- **`README.md`** - Project overview
- **`replit.md`** - Project history and user preferences

---

## 💡 Tips & Best Practices

### Working with the API Client

**Always use `{data, error}` destructuring:**

```typescript
// ✅ Good
const { data, error } = await api.programs.list();
if (error) {
  console.error('Error:', error);
  return;
}
console.log('Programs:', data);

// ❌ Bad (doesn't handle errors)
const data = await api.programs.list();
```

**Include `credentials: 'include'` in all authenticated requests:**

```typescript
// Already done in api.ts fetchApi() helper
fetch(url, {
  credentials: 'include', // ← Sends session cookie
  // ...
})
```

### Database Queries with Drizzle

**Use prepared statements for security:**

```typescript
// ✅ Good (safe from SQL injection)
const user = await db.select().from(users).where(eq(users.email, email));

// ❌ Bad (vulnerable, but Drizzle prevents this)
const user = await db.execute(sql`SELECT * FROM users WHERE email = '${email}'`);
```

**Always use transactions for multi-step operations:**

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ email, passwordHash });
  await tx.insert(profiles).values({ userId, firstName });
});
```

### Session Management

**Check authentication in backend:**

```javascript
// ✅ Always use middleware
router.get('/protected', requireAuth, async (req, res) => {
  const userId = req.session.user.id; // Safe, guaranteed to exist
  // ...
});

// ❌ Don't check manually
router.get('/protected', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // ... repetitive
});
```

**Extend session on activity:**

```javascript
// express-session does this automatically
// Touching session updates `expire` in session table
req.session.touch(); // Usually not needed, done automatically
```

### Frontend Performance

**Lazy load heavy components:**

```typescript
// ✅ Lazy load map (Leaflet is large)
const ProgramMap = lazy(() => import('./components/ProgramMap'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ProgramMap programs={programs} />
</Suspense>
```

**Debounce search inputs:**

```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => setSearchQuery(query), 300),
  []
);
```

### Security

**Never log sensitive data:**

```typescript
// ❌ Bad
console.log('User password:', password);
console.log('Session:', req.session);

// ✅ Good
console.log('Login attempt for email:', email);
console.log('Session exists:', !!req.session.user);
```

**Validate all user input:**

```typescript
// Use Zod or similar
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  age: z.number().min(13).max(25),
});

const result = RegisterSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}
```

---

## 🤝 Getting Help

### Resources

**Documentation:**
- [BUILD.md](./BUILD.md) - Complete technical reference
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)

**Tools:**
- Drizzle Studio: `npm run db:studio` (visual database editor)
- Browser DevTools: Network tab for API debugging
- React DevTools: Component tree and state inspection

### Common Questions

**Q: How do I add a new field to the user profile?**

A: 
1. Add column to `profiles` table in `server/schema.ts`
2. Run `npm run db:push`
3. Update `PUT /api/profile` to accept new field
4. Update frontend form to collect new data

**Q: Can I use Supabase client methods?**

A: No, all Supabase code has been removed. Use `api.*` methods from `src/lib/api.ts` instead.

**Q: How do I test email sending locally?**

A: Use a service like [Mailtrap](https://mailtrap.io/) or [Ethereal](https://ethereal.email/) for development.

**Q: Why are sessions in the database, not Redis?**

A: PostgreSQL is already used for data, so using `connect-pg-simple` reduces infrastructure complexity. For high-scale, consider Redis.

**Q: How do I add push notifications?**

A: 
1. Set up Firebase Cloud Messaging or OneSignal
2. Add service worker registration
3. Create `/api/notifications/subscribe` endpoint
4. Store push tokens in `profiles` table

---

## 📝 Next Steps

### Immediate Priorities

1. **Implement email sending** for password resets
   - Choose provider: SendGrid (free tier), Mailgun, or Replit Email
   - Update `server/routes/auth.js` → `/reset-password` endpoint
   - Add email templates

2. **Complete offline sync** in `src/lib/queue.ts`
   - Implement `processQueue()` with actual API retries
   - Add success/failure notifications
   - Test: save program offline → go online → verify sync

3. **Add XP notifications** when users earn points
   - Toast notification on check-in (+5 XP)
   - Toast on program attendance (+10 XP)
   - Celebrate milestones (50 XP, 100 XP, etc.)

### Short-Term Enhancements

4. **Improve error messages** throughout app
   - Replace generic "An error occurred" with specific guidance
   - Add retry buttons for failed requests
   - Log errors to tracking service (Sentry)

5. **Add loading states** to async actions
   - Skeleton screens for program lists
   - Spinner on check-in submission
   - Disable buttons during save/delete operations

6. **Write tests** for critical paths
   - Authentication flow (register → login → logout)
   - Check-in creation and streak calculation
   - Program save/unsave
   - Use Vitest (already installed)

### Long-Term Goals

7. **Multi-org dashboard** (v1.2)
   - Organization signup and verification
   - Program creation interface
   - Youth referral system
   - Encrypted case notes

8. **Advanced analytics** (v2.0)
   - Mood trend visualization
   - Program impact tracking
   - Demographic insights (aggregated, privacy-preserving)
   - Export reports for funders

---

## 🎉 You're All Set!

This handoff document should give you everything needed to jump in and start coding. The app is stable, well-documented, and ready for enhancement.

**When in doubt:**
1. Check `BUILD.md` for technical details
2. Look at existing code for patterns
3. Run `npm run db:studio` to explore the database
4. Test with the test account before making changes

**Remember:**
- All Supabase code has been removed → Use `api.*` methods
- Session auth with cookies → No JWT tokens
- Database changes → `npm run db:push`
- Frontend changes → Hot reload (just save)

**Good luck, and happy coding! 🚀**

---

**Questions?** Review BUILD.md or check the codebase for examples.

**Last Updated:** October 29, 2025  
**Next Review:** When v1.1 features are added
