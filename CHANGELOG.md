# Changelog

All notable changes to Room XI Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-18

### 🎉 Major Release: Edmonton Multi-Org Expansion

This release transforms Room XI Connect from a single-organization platform into a multi-tenant ecosystem supporting warm referrals, guardian consent management, and enhanced youth support features.

### Added

#### Multi-Organization System
- **Organizations Table**: Support for multiple partner organizations (nonprofits, schools, government, healthcare)
- **Organization Membership**: Role-based access control (org_admin, staff, school_staff, volunteer)
- **Organization Dashboard**: Real-time insights for youth workers at `/org/dashboard`

#### Guardian Consent Management
- **Digital Consent System**: PHIPA-compliant consent tracking for data sharing
- **Email Verification**: SendGrid-powered consent request emails with secure tokens
- **Age Verification**: Guardian age validation (18+) before consent
- **Consent Verification Page**: Guardian portal at `/verify-consent/:token`
- **Audit Logging**: Complete audit trail with IP, user agent, and timestamps

#### Living Journal
- **Journal Entries**: Private journaling with mood tracking
- **Write Alone Mode**: Distraction-free writing experience
- **Talk with Ximi Mode**: AI-powered conversational journaling (requires OpenAI)
- **Journal History**: View past entries organized by date
- **Quick Actions**: Easy access to journal from home page

#### Warm Referrals
- **Referral System**: Consent-based referrals between organizations
- **Referral Workflow**: Pending → Sent → Accepted/Declined states
- **Priority Levels**: Low, Medium, High, Urgent
- **Automatic Consent Checks**: Triggers guardian consent if needed
- **Referral Dashboard**: Track incoming and outgoing referrals

#### Coping Skills Library
- **30+ Evidence-Based Skills**: Auto-seeded on migration
- **Categories**: Anxiety, stress, sleep, anger, sadness, overwhelm, general
- **Difficulty Levels**: Easy, moderate, advanced
- **Cultural Adaptation**: Support for culturally-adapted techniques
- **Step-by-Step Instructions**: Clear guidance for each skill

#### Enhanced Youth Profiles
- **Guardian Information**: Name, email, phone, relationship
- **Guardian Verification**: Track verification status and timestamp
- **Legal Names**: Separate legal and display names
- **Emergency Contacts**: Name, phone, relationship
- **Indigenous Identity**: First Nations, Métis, Inuit options
- **Account Completion Tracking**: Monitor profile completeness

#### Case Management
- **Encrypted Case Notes**: AES-256-GCM encryption for sensitive notes
- **Case Note Categories**: Intake, session, incident, progress, other
- **Organization-Scoped Notes**: Each org maintains separate notes
- **Author Tracking**: Track who created each note

#### Security & Compliance
- **Row Level Security (RLS)**: 40+ policies for data protection
- **Encryption**: AES-256-GCM for case notes
- **Input Validation**: Zod schemas for all user inputs
- **Rate Limiting**: Upstash Redis integration
- **Audit Trail**: Comprehensive logging of all data access
- **CSRF Protection**: Token-based CSRF prevention

### Changed

#### Frontend
- **React Router v7 Future Flags**: Enabled to fix deprecation warnings
- **Import Paths**: Standardized to use `@/` alias throughout
- **Home Page**: Added QuickActions section with Journal link
- **Router Configuration**: Added new routes for journal, consent, org dashboard

#### Database
- **Youth Profiles**: Added 12 new columns for guardian/identity data
- **Enhanced Validation**: Stricter constraints on email, phone, text lengths
- **Triggers**: Auto-update timestamps, consent cascades, referral updates

#### Dependencies
- **Added Zod**: Input validation library (^3.25.76)
- **Updated Supabase**: Latest client library (^2.45.0)

### Technical Details

#### Database Migration
- **File**: `supabase/migrations/20241018_edmonton_expansion.sql`
- **Tables Added**: 11 new tables
- **Columns Added**: 12 new columns to `youth_profiles`
- **RLS Policies**: 40+ policies
- **Functions**: 8 database functions
- **Triggers**: 3 triggers for data integrity

#### Edge Functions
- **referral-create**: Create warm referrals with consent checks
- **send-consent-email**: Send guardian consent requests via SendGrid
- **verify-consent**: Verify guardian consent via email link
- **xid-create**: Enhanced anonymous identifier generation
- **user-delete**: User deletion/forget-me functionality

#### Environment Variables Required
- `SENDGRID_API_KEY`: SendGrid API key
- `SENDGRID_FROM`: Sender email address
- `UPSTASH_REDIS_REST_URL`: Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis token
- `APP_URL`: Application URL
- `app.case_notes_encryption_key`: Encryption key (Supabase Vault)
- `app.xid_pepper`: XID pepper (Supabase Vault)

### Migration Guide

See [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) for detailed migration instructions from v1.0 to v2.0.

### Breaking Changes

⚠️ **Database Schema Changes**: This release adds new tables and columns. Existing data is preserved, but you must run the migration before deploying.

⚠️ **Environment Variables**: New required variables for SendGrid and Upstash. See `.env.example`.

⚠️ **Edge Functions**: New functions must be deployed to Supabase.

### Deployment Checklist

- [ ] Backup database
- [ ] Set up SendGrid account and API key
- [ ] Set up Upstash Redis account
- [ ] Generate encryption keys
- [ ] Store secrets in Supabase Vault
- [ ] Run database migration: `supabase db push`
- [ ] Deploy edge functions
- [ ] Seed initial data (organizations, programs)
- [ ] Test all features in staging
- [ ] Deploy frontend to production
- [ ] Monitor for 48 hours post-deployment

---

## [1.0.0] - 2025-09-01

### Initial Release

#### Features
- **Youth Mood Tracking**: Visual "Mood Orb" for daily check-ins
- **Program Discovery**: Browse and search youth programs
- **QR Attendance**: Scan QR codes to check in to programs
- **Crisis Support**: Immediate access to crisis resources
- **User Profiles**: Basic youth profile management
- **Authentication**: Supabase Auth with email/password
- **PWA**: Offline-first Progressive Web App
- **Responsive Design**: Mobile-first, works on all devices

#### Tech Stack
- React 18 + TypeScript
- Tailwind CSS + Framer Motion
- React Router v6
- Supabase (PostgreSQL + Auth)
- Vite (build tool)
- Vercel (hosting)

#### Database Tables
- `youth_profiles`: Youth user profiles
- `programs`: Programs and events
- `attendance`: Program attendance tracking
- `mood_checkins`: Mood tracking data
- `crisis_supports`: Crisis resources

---

## Version History

- **v2.0.0** (2025-10-18): Edmonton Multi-Org Expansion
- **v1.0.0** (2025-09-01): Initial Release

---

## Upcoming Features (v3.0 Roadmap)

### Planned for Q1 2026
- 211 Alberta integration
- Alberta Digital ID for guardian verification
- SchoolZone SSO integration
- Video chat support
- Advanced analytics dashboard
- CSV export for funders
- Map view with program pins

### Under Consideration
- Mobile app (React Native)
- SMS notifications
- Multi-language support (French, Cree, Arabic)
- Peer support matching
- Gamification elements

---

## Support

For questions or issues:
- **Email**: hello@roomxi.org
- **Support**: support@roomxiconnect.org
- **Security**: security@roomxi.org

---

**Built with ❤️ by Room XI for youth across Canada**

