# Room XI Connect - Developer Handoff Documentation

**Last Updated:** November 22, 2025  
**Version:** 1.3.0  
**Status:** Production Ready

## Project Overview

Room XI Connect is a trauma-informed, privacy-first youth mental health platform serving ages 13-25. The application provides daily mood check-ins, local program discovery, crisis support, and an AI companion named Ximi. Currently serving over 570 youth through local programs and pilots in Edmonton.

## Architecture Summary

### Tech Stack
- **Frontend:** React 18 with TypeScript, Vite 5, React Router v6, Tailwind CSS
- **Backend:** Express.js with session-based authentication
- **Database:** PostgreSQL (Replit/Neon) with Drizzle ORM
- **AI:** OpenAI-compatible API (Replit AI) for Ximi companion
- **Deployment:** Replit Autoscale

### Key Architecture Decisions

#### 1. Database Migration (v1.3.0)
- **FROM:** Supabase (PostgreSQL + Auth Service)
- **TO:** Replit's built-in PostgreSQL (Neon)
- **WHY:** Single database architecture, better platform integration, simplified deployment
- **IMPACT:** All authentication now handled by Express sessions stored in PostgreSQL

#### 2. Authentication System
- **Method:** Express sessions with `connect-pg-simple` PostgreSQL adapter
- **Security:** CSRF protection, bcrypt password hashing, session regeneration
- **Admin:** Separate admin authentication with environment variable credentials
- **Guardian:** Two-tier consent system for users under 16

#### 3. Privacy & Compliance
- **Standards:** Alberta PIPA & HIA compliance
- **Design:** Privacy-by-design, k-anonymity, differential privacy
- **Features:** Granular consent toggles, data export, audit logging

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (provided by Replit)
- Environment secrets configured in Replit

### Required Environment Variables
```
# Database (automatically provided by Replit)
DATABASE_URL=postgresql://...
PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<bcrypt_hashed_password>

# Email Service (for guardian verification)
GMAIL_USER=<your_gmail>
GMAIL_APP_PASSWORD=<app_specific_password>

# Optional API Keys
GEMINI_API_KEY=<for_ai_features>
VAPID_PUBLIC_KEY=<for_push_notifications>
VAPID_PRIVATE_KEY=<for_push_notifications>
VAPID_EMAIL=<admin_email>
```

### Local Development
```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Seed database with Edmonton programs
npm run db:seed

# Start development server
npm run dev
```

### Database Management
```bash
# Generate schema changes
npm run db:generate

# Apply schema changes
npm run db:push

# Force sync (use carefully)
npm run db:push --force

# Open Drizzle Studio
npm run db:studio
```

## Project Structure

```
room-xi-connect/
├── server/              # Express backend
│   ├── index.js        # Server entry & middleware
│   ├── db.js           # Database connection
│   ├── schema.ts       # Drizzle ORM schema
│   ├── routes/         # API endpoints
│   │   ├── auth.js     # Authentication
│   │   ├── admin.js    # Admin dashboard
│   │   ├── programs.js # Program management
│   │   └── ximi.js     # AI companion
│   └── services/       # Business logic
├── src/                # React frontend
│   ├── routes/         # Page components
│   ├── ui/             # Reusable components
│   ├── lib/            # Utilities
│   │   ├── api.ts      # API client with CSRF
│   │   └── session.tsx # Session provider
│   └── main.tsx        # App entry
└── package.json        # Dependencies

```

## API Architecture

### Authentication Flow
1. User registers via `/api/auth/register`
2. Session created and stored in PostgreSQL
3. CSRF token generated for protected routes
4. Session cookie sent to client
5. All subsequent requests include CSRF token

### CSRF Token Retry Mechanism
- Automatic retry on stale CSRF tokens
- Transparent to users
- Prevents authentication lockouts
- Implemented in `src/lib/api.ts`

### Key API Endpoints
```
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User login
POST   /api/auth/logout       # User logout
GET    /api/auth/me           # Current user

POST   /api/admin/login       # Admin login
GET    /api/admin/stats       # Dashboard stats
GET    /api/admin/logs        # Audit logs

GET    /api/programs          # List programs
GET    /api/events/happening-now  # Real-time events
POST   /api/checkins          # Mood check-in
POST   /api/ximi/chat         # AI companion
```

## Database Schema Highlights

### Core Tables
- `users` - User accounts with bcrypt password hashes
- `session` - Express session storage
- `profiles` - User profiles and preferences
- `checkins` - Daily mood check-ins
- `programs` - Youth programs (98 real Edmonton programs)
- `program_events` - Recurring/one-time events
- `guardian_verifications` - Parent consent tracking

### Security Features
- Password hashing with bcrypt
- Session regeneration on login
- CSRF token validation
- Rate limiting on auth endpoints
- Audit logging for compliance

## Deployment

### Replit Deployment
1. Code pushes automatically trigger deployment
2. Database migrations run via `npm run db:push`
3. Environment secrets managed in Replit Secrets tab
4. Autoscale handles traffic scaling

### Production Checklist
- [ ] All environment secrets configured
- [ ] Database migrations applied
- [ ] Admin credentials set
- [ ] Email service configured
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] SSL/TLS enabled (automatic on Replit)

## Common Tasks

### Adding a New API Endpoint
1. Create route handler in `server/routes/`
2. Add to router in `server/index.js`
3. Update API client in `src/lib/api.ts`
4. Add TypeScript types if needed
5. Test with CSRF protection

### Modifying Database Schema
1. Update `server/schema.ts`
2. Run `npm run db:generate` to create migration
3. Review generated SQL
4. Run `npm run db:push` to apply
5. Update relevant API endpoints

### Debugging Authentication Issues
1. Check session table in database
2. Verify CSRF token in request headers
3. Check session cookie in browser
4. Review auth middleware logs
5. Test with `curl` to isolate frontend issues

## Testing

### Manual Testing Checklist
- [ ] User registration flow
- [ ] Guardian verification (users under 16)
- [ ] Login/logout functionality
- [ ] Mood check-in
- [ ] Program browsing (guest and authenticated)
- [ ] Admin dashboard access
- [ ] Crisis support resources
- [ ] Ximi AI responses

### Key Test Accounts
```
# Regular User
Email: test@example.com
Password: (create new account)

# Admin Access
Username: admin
Password: (check ADMIN_PASSWORD secret)
```

## Monitoring & Maintenance

### Health Checks
- Database connection: `/api/health`
- Session status: Check `session` table
- Error logs: Replit console
- Admin dashboard: `/admin` route

### Regular Maintenance
- Review audit logs monthly
- Update program database seasonally
- Monitor session table size
- Check guardian verification queue
- Review crisis detection logs

## Support & Resources

### Documentation
- `BUILD.md` - Complete build documentation
- `ARCHITECTURE.md` - System architecture details
- `replit.md` - User preferences and project notes

### External Services
- **Database:** Neon PostgreSQL (via Replit)
- **Email:** Gmail SMTP (guardian verification)
- **AI:** Replit AI (OpenAI-compatible)
- **Donations:** Zeffy platform

### Contact
For questions about the codebase or architecture decisions, refer to the inline comments and documentation. The codebase is well-commented with explanations of complex logic and security considerations.

## Migration Notes

### From Supabase to Replit PostgreSQL (v1.3.0)
- All `@supabase` dependencies removed
- `src/lib/supabase.ts` deleted
- Authentication moved to Express sessions
- No external auth service dependencies
- Single database for all data

### Benefits of Current Architecture
1. **Simplified Stack:** One database, one auth system
2. **Better Control:** Direct session management
3. **Platform Integration:** Native Replit features
4. **Cost Effective:** No external service fees
5. **Privacy:** All data in one controlled location

---

*This document represents the current state of Room XI Connect as of November 22, 2025. The application is production-ready and actively serving youth in Edmonton.*