# Room XI Connect -- Project Overview

**Room 11 Foundation**
**Date:** February 16, 2026
**Version:** 2.0
**Classification:** Stakeholder / Funder Document

---

## 1. Project Summary

Room XI Connect is a mobile-first digital platform built by the Room 11 Foundation to support the mental health and wellness of young people ages 13 to 25 in Edmonton, Alberta.

The platform addresses a critical gap: while youth mental health challenges are growing, most young Canadians who need support never receive it. Wait times for youth mental health services in Alberta average 6 to 12 months, and traditional outreach methods fail to reach today's digital-native youth where they actually are -- on their phones.

Room XI Connect solves this by giving young people a single, trusted place to track their emotional wellness, discover local programs and activities, access crisis support instantly, and find relevant programs with an AI-powered Program Finder -- all for free, all from their phone.

The platform is built on a privacy-first foundation, fully compliant with Alberta and federal privacy law, and designed in collaboration with youth to feel safe, welcoming, and easy to use.

> "Your space. Your vibe. Your people."

---

## 2. Core Features

### Daily Mood Check-Ins

Youth track their emotional wellness using a trauma-informed, 6-level mood system with visual feedback through a personalized "Mood Orb." The system tracks streaks to encourage consistent check-ins -- a practice clinically shown to improve emotional awareness and early intervention. Check-ins also capture SAMHSA Wellness Dimensions (emotional, physical, social, spiritual, intellectual, occupational) to give youth a fuller picture of their wellbeing.

### Program Discovery

A searchable, filterable directory of local youth programs in Edmonton -- sports, arts, mental health, employment, cultural activities, and more. Features include:

- Interactive map view with location-based "Show Nearby" discovery
- "Happening Now" real-time event finder
- Filters by free/paid, indoor/outdoor, age range, and category
- Save favorites for quick access
- QR code attendance tracking for partner organizations

Youth must complete a daily check-in before browsing programs, reinforcing the habit of regular check-ins.

### Ximi: AI Program Finder

Ximi is an AI-powered Program Finder that helps youth discover local programs, check schedules, and find activities. Key features:

- Searches programs by category, schedule, location, and interests
- Real-time crisis language detection that immediately surfaces help resources
- Proactive outreach based on mood patterns, inactivity, or low engagement
- Clear disclaimer that Ximi is not a therapist or counselor and never replaces professional support
- Requires explicit consent before activation, with full disclosure about data processing

### Crisis Support

One tap connects youth to crisis resources -- phone hotlines, text lines, and chat options. Crisis resources are always accessible and never hidden behind logins. A floating crisis button is always visible across the app. Youth can also create Personal Safety Plans with 7 guided sections (warning signs, coping strategies, safe places, trusted contacts, professional resources, escalation steps, and notes for others) that can be securely shared via link or QR code.

### Tournament System

A community engagement feature that lets organizations host tournaments. Includes team creation and management, registrations, game scheduling, standings, and announcements. The system is fully integrated with Ximi and the notification system.

### XiP Points Gamification

A 10-level rewards system that encourages wellness activities. Youth earn XiP (Experience in Progress) Points for completing check-ins, attending programs, engaging with Ximi, and other positive actions. The system includes achievements and profile progress tracking.

---

## 3. Privacy and Safety

Room XI Connect was built with privacy at its core. Unlike typical apps that harvest youth data, this platform collects only what is necessary and puts youth in control of their information.

### Compliance

The platform is designed to comply with:

- **PIPA** (Personal Information Protection Act) -- Alberta provincial privacy law
- **PIPEDA** (Personal Information Protection and Electronic Documents Act) -- Federal privacy law
- **HIA** (Health Information Act) -- Alberta considerations for wellness data

### Two-Tier Consent System

**Layer 1 -- Basic Consents (required for account creation):**
- Terms of Use acceptance
- Privacy Notice acknowledgment
- Data Collection consent

**Layer 2 -- Safety Profile Consents (optional, controls specific features):**
- Location sharing
- Mood Orb sharing
- Check-in sharing
- Push notifications
- Research participation

All consents default to OFF. Youth control what they share through a Privacy Center where they can view, grant, or withdraw consent at any time.

### Parental Consent

Youth under 16 require guardian consent through a two-step email verification process. Alberta's Mature Minor Doctrine is also supported, allowing youth ages 13 to 15 who demonstrate sufficient maturity to consent to certain services independently. All consent events are logged with IP address, user agent, and timestamps for audit purposes.

### Data Protection

- Passwords hashed with bcrypt (12 rounds)
- AES-256-GCM encryption for sensitive data (case notes, offline data)
- HTTPS enforced with HSTS headers in production
- PII stripped from all data sent to AI services
- Location data anonymized using H3 hex bucketing with k-anonymity thresholds (minimum 7 users per geographic cell) and Laplace noise injection
- No advertising. No data selling. Ever.

### Transparency

A public Transparency Dashboard shows exactly what data is collected and how it is used. Users can export their personal data and request account deletion at any time.

---

## 4. Multi-Portal Architecture

Room XI Connect serves five distinct audiences through dedicated portals, each with isolated session management and role-based access control.

### Youth Portal

The primary experience. Youth can complete mood check-ins, browse and save programs, chat with Ximi, create safety plans, view their XiP Points and achievements, manage privacy settings, and access crisis support.

### Parent Portal

Parents and guardians of youth under 16 can view linked youth dashboards (with consent), manage consent permissions, review program participation, and access relevant documents. Guardians are verified through a secure email-based process.

### Organization Portal

Partner organizations can manage their program listings, track attendance via QR codes, view anonymized engagement insights, manage staff accounts, create and manage tournaments, handle referrals, and generate reports for grant applications.

### Admin Portal

System administrators have access to a compliance dashboard, system health status, organization management, user oversight, audit logs, AI intervention monitoring, and KPI dashboards.

### Youth Worker Portal

Front-line youth workers can manage encrypted case notes (AES-256-GCM), submit and track referrals between organizations, verify consent status, and access tools for direct youth support.

---

## 5. Technical Highlights

### Progressive Web App (PWA)

Room XI Connect runs as a Progressive Web App, meaning it works on any device -- iOS, Android, or desktop -- through a web browser, with the option to install it like a native app. Capacitor builds are also available for native iOS and Android distribution.

### Offline Support

Youth do not always have reliable internet. The app works offline:

- Browse saved programs without WiFi
- Complete check-ins that sync when reconnected
- Access crisis resources anytime
- Client-side data encrypted in IndexedDB using AES-GCM before storage

### Bilingual Support

Full English and French language support throughout the application, meeting Canadian bilingual accessibility standards.

### Accessibility

The interface follows accessibility best practices:

- Minimum 44x44px touch targets
- Visible focus states for keyboard navigation
- ARIA landmarks for screen readers
- High-contrast mode available
- Calm, trauma-informed color palette

### Structured Logging and Monitoring

- Request correlation IDs for end-to-end request tracing
- Structured JSON logging for all server events
- Deep health check endpoint monitoring database, sessions, and external services
- Audit logging for all consent changes, admin actions, and data access events

---

## 6. Production Readiness Status

The platform has undergone significant hardening to prepare for production deployment. The following security and reliability measures are in place:

| Area | Status |
|------|--------|
| CSRF Protection | Implemented -- 32-byte cryptographically random tokens validated on all state-changing requests |
| Database Transactions | Implemented -- Row-level locking for data integrity on concurrent operations |
| Rate Limiting | Implemented -- Tiered limits for authentication (15/15min), admin login (5/15min), password reset (5/hr), and write operations (200/10min) |
| Account Lockout | Implemented -- Progressive lockout after 5 failed attempts, 30-minute duration |
| Request Correlation IDs | Implemented -- Unique IDs attached to every request for end-to-end tracing |
| Deep Health Checks | Implemented -- Endpoint verifies database connectivity, session store, and service health |
| Input Validation | Implemented -- Zod schema validation on all user inputs |
| Session Hardening | Implemented -- 4-hour absolute timeout, 30-minute inactivity timeout, httpOnly/secure/sameSite cookies, PostgreSQL-backed session store |
| CSP Headers | Implemented -- Content Security Policy with environment-aware configuration |
| Security Headers | Implemented -- HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, COOP, CORP |
| Cookie Hardening | Implemented -- Secure flag in production, httpOnly, sameSite strict |
| Seed Script Guards | Implemented -- Production environment protection against accidental data seeding |
| Demo Route Gating | Implemented -- Demo routes disabled in production |
| Graceful AI Degradation | Implemented -- Fallback responses when AI service is unavailable |

---

## 7. Current Project Stats

| Metric | Value |
|--------|-------|
| Database Tables | 82 |
| Programs Listed | 11 (seed data; expandable to 100+) |
| Active Portals | 5 (Youth, Parent, Org, Admin, Youth Worker) |
| Smoke Tests | 17/17 passing |
| Health Checks | All green |
| Partner Organizations | 6+ |
| Target Age Range | 13--25 |
| Service Area | Edmonton, Alberta |
| Cost to Youth | Free |
| Language Support | English and French |

---

## 8. What Comes Next

The following items are planned for the next phase of development to bring the platform to full production launch:

| Priority | Description |
|----------|-------------|
| Load Testing | Validate performance under expected user volumes to ensure reliability at scale |
| Error Monitoring (Sentry) | Integrate real-time error tracking and alerting for production issues |
| Penetration Testing | Engage a third-party security firm to conduct a formal security assessment |
| Legal Sign-Off | Final review by legal counsel to confirm PIPA/PIPEDA compliance documentation |
| User Growth | Marketing, outreach, and youth ambassador program to drive adoption |
| Program Expansion | Onboard 100+ additional Edmonton programs into the directory |
| Indigenous Integration | Culturally specific resources and partnerships |
| Advanced Analytics | Enhanced outcome tracking for funders and researchers |

---

## 9. Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS |
| Backend | Node.js, Express, PostgreSQL (Neon) |
| ORM | Drizzle ORM |
| AI | OpenAI-compatible API (GPT-4o-mini via Replit AI) |
| Hosting | Replit (scalable cloud infrastructure) |
| Mobile | Progressive Web App + Capacitor (iOS/Android) |
| Security | bcrypt, AES-256-GCM, HTTPS/TLS, CSRF tokens |
| Privacy | H3 hex bucketing, Laplace noise, k-anonymity |
| Internationalization | i18next (English/French) |

---

## 10. Contact

**Room 11 Foundation**

- General: hello@roomxi.org
- Support: support@roomxiconnect.org
- Security: security@roomxi.org

*Room XI Connect is a project of the Room 11 Foundation, a registered non-profit organization dedicated to youth mental health and wellness in Alberta.*

*Empowering youth to feel seen, build capacity, and find community.*
