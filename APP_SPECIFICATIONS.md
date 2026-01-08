# Room XI Connect - Application Specifications

**Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Production Ready (Beta Launch)  
**Organization:** Room 11 Foundation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Mission & Vision](#2-mission--vision)
3. [Target Audience](#3-target-audience)
4. [Core Features](#4-core-features)
5. [Technical Architecture](#5-technical-architecture)
6. [User Flows](#6-user-flows)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Security & Privacy](#9-security--privacy)
10. [Design System](#10-design-system)
11. [Testing & Quality Assurance](#11-testing--quality-assurance)
12. [Deployment & Infrastructure](#12-deployment--infrastructure)

---

## 1. Executive Summary

### What is Room XI Connect?

Room XI Connect is a youth mental health and wellness platform designed for young people ages 13-25 in Edmonton, Alberta. The application empowers youth by connecting them with community resources, providing daily wellness check-ins, offering AI-assisted support, and ensuring access to crisis resources when needed.

### Key Metrics

| Metric | Value |
|--------|-------|
| Target Age Range | 13-25 years |
| Current User Base | 570+ youth |
| Program Database | 98+ Edmonton programs |
| Service Area | Edmonton, Alberta |
| Languages | English (French planned) |

### Core Value Proposition

- **Feel Seen:** Daily mood tracking with a beautiful, trauma-informed interface
- **Build Capacity:** Streak-based engagement and wellness dimension tracking
- **Find Community:** Discover 98+ local programs, events, and activities
- **Get Support:** 24/7 crisis resources and AI companion (Ximi)

### Key Differentiators

1. **Privacy-First Design:** PIPA/PIPEDA compliant with granular consent controls
2. **Trauma-Informed UX:** Calm, non-judgmental interface with cosmic garden aesthetic
3. **Programs-First Approach:** Browse programs without login; authentication for personalized features
4. **AI Companion (Ximi):** Dual-personality AI with crisis detection
5. **Personal Safety Plans:** Secure, shareable crisis support plans
6. **Offline-First PWA:** Works without internet with automatic sync

---

## 2. Mission & Vision

### Mission Statement

> "Your space. Your vibe. Your people."

Room XI Connect exists to ensure every young person in Edmonton has access to the mental health support and community connections they need to thrive.

### Vision

To become the trusted digital companion for youth wellness in Alberta, connecting young people with the programs, resources, and support systems that help them navigate life's challenges.

### Guiding Principles

1. **Youth-Centered:** Every feature designed with and for young people
2. **Privacy-by-Design:** Data minimization and consent-first architecture
3. **Accessibility:** WCAG 2.1 AA compliant, supports reduced motion
4. **Trauma-Informed:** Safe, supportive, non-triggering design patterns
5. **Community-Connected:** Partnering with local organizations

### Partner Organizations

- CanManDan
- JumpStart
- Allendale Community League
- Duggan Community League
- YMCA of Northern Alberta
- OTB Basketball

---

## 3. Target Audience

### Primary Users: Youth (Ages 13-25)

| Segment | Age | Characteristics | Key Needs |
|---------|-----|-----------------|-----------|
| Young Teens | 13-15 | Requires guardian consent, school-focused | Safe exploration, parental oversight |
| Older Teens | 16-18 | Mature minor doctrine applies, transitioning | Independence, identity, peer connection |
| Young Adults | 19-25 | University/workforce, independent | Community, career programs, mental health |

### Secondary Users

| User Type | Role | Access Level |
|-----------|------|--------------|
| Parents/Guardians | Oversight, consent approval | Parent Portal (filtered view) |
| Program Organizations | Program management, analytics | Org Dashboard |
| Administrators | System management, compliance | Admin Dashboard |

### User Personas

#### Persona 1: Maya (Age 16)

- **Background:** High school student, anxiety, new to Edmonton
- **Goals:** Find after-school programs, track moods, connect with peers
- **Pain Points:** Feels isolated, overwhelmed by options
- **How Room XI Helps:** Browse programs on map, daily check-ins, Ximi support

#### Persona 2: Jordan (Age 22)

- **Background:** University student, dealing with depression
- **Goals:** Find free mental health resources, maintain wellness habits
- **Pain Points:** Inconsistent self-care, cost barriers
- **How Room XI Helps:** Mood streaks, free program filters, crisis resources

#### Persona 3: Parent - Lisa

- **Background:** Mother of 14-year-old using Room XI
- **Goals:** Ensure child's safety, understand app usage
- **Pain Points:** Privacy concerns, wants visibility without surveillance
- **How Room XI Helps:** Guardian consent, privacy-respecting parent portal

---

## 4. Core Features

### 4.1 Daily Mood Check-Ins

Track emotional wellness using a trauma-informed 6-level mood system.

| Mood Level | Name | Emoji | Color | Description |
|------------|------|-------|-------|-------------|
| 1 | Cold | ❄️ | Cool Blue | Low energy, withdrawn |
| 2 | Stormy | ⛈️ | Dark Slate | Turbulent, distressed |
| 3 | Foggy | 🌫️ | Gray | Unclear, disconnected |
| 4 | Clear | ☀️ | Yellow | Stable, calm |
| 5 | Breezy | ⚡ | Teal | Energetic, positive |
| 6 | Aurora | 🌌 | Gold/Purple | Flourishing, vibrant |

**Features:**
- One check-in per day (enforced)
- SAMHSA 8 wellness dimensions selection
- Optional reflection note (140 characters)
- Crisis keyword detection in notes
- Streak tracking with DST-safe date handling
- 7-day mood orb visualization (canvas-based gradient)

### 4.2 Program Discovery

Browse 98+ local programs and events in Edmonton.

**Capabilities:**
- List, Map, and Saved views
- Real-time "Happening Now" event finder
- Filter by: tags, cost (free/paid), environment (indoor/outdoor)
- Location-based "Show Nearby" with radius options (1km, 2km, 5km)
- Save programs for later (authenticated users)
- QR code attendance tracking
- Detailed program pages with directions

**Data Fields:**
- Title, description, organizer
- Location (name, address, lat/lng)
- Schedule (recurring events support)
- Cost, age range, accessibility notes
- Tags and wellness dimensions

### 4.3 Ximi AI Companion

Dual-personality AI assistant for wellness support.

| Mode | Personality | Use Case |
|------|-------------|----------|
| Little Sibling | Playful, casual, emoji-friendly | Light conversations, daily check-ins |
| Peer Guide | Mature, thoughtful, supportive | Journaling, deeper discussions |

**Safety Features:**
- Consent gating (explicit opt-in required)
- Persistent "I'm not a clinician" disclaimer
- Crisis keyword detection (suicide, self-harm, etc.)
- Automatic crisis resource display on detection
- Mood-based proactive support (triggers on mood decline)
- Conversation history with trend analysis

**Technical:**
- Powered by Replit AI (OpenAI-compatible, gpt-4o-mini)
- Context window includes recent mood data
- Rate limited to prevent abuse

### 4.4 Personal Safety Plans

Structured crisis support plans created by youth.

**7 Sections:**
1. Warning Signs
2. Coping Steps
3. Safe Places
4. Trusted Contacts
5. Professional Support
6. Escalation Steps
7. Notes for Others

**Sharing:**
- Secure share links (SHA256-hashed tokens)
- Configurable expiration (7-90 days)
- QR code generation for links
- Revocable access
- Public view shows plan + crisis resources

**Compliance:**
- All actions logged to `safety_plan_events`
- PIPA audit trail maintained
- Token pepper stored in environment secrets

### 4.5 Crisis Support

24/7 access to mental health resources.

**Resources:**
- Crisis hotlines (phone)
- Text-based crisis support
- Chat options
- Local Edmonton resources
- Indigenous support services

**Integration:**
- "Get Help" button always visible
- Crisis sheet accessible from any screen
- Auto-displayed when crisis keywords detected
- Mobile-optimized one-tap calling

### 4.6 QR Code Attendance

Track program participation with privacy-preserving identifiers.

**Flow:**
1. Youth arrives at program
2. Scans program's QR code with app
3. Attendance logged using XID (non-identifying)
4. +10 XP earned
5. Appears in attendance history

**Privacy:**
- Uses XID (hashed identifier) not personal info
- Programs see attendance counts, not individual data
- Youth owns their attendance history

### 4.7 Offline Support

Full offline functionality with automatic sync.

**Cached for Offline:**
- Programs list
- Events list
- Crisis resources
- Daily quotes

**Queued When Offline:**
- Check-ins
- Saved programs
- Profile updates

**Technical:**
- IndexedDB via `idb` library
- Service Worker (Workbox) caching
- AES-GCM encryption for sensitive offline data
- Visual sync indicator in UI

---

## 5. Technical Architecture

### 5.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser/PWA)                      │
│  React 18 + TypeScript │ Vite 5 │ Tailwind │ IndexedDB      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS/REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    Express.js Backend                        │
│  Session Auth │ Drizzle ORM │ Rate Limiting │ CSRF Token    │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL (TLS)
┌──────────────────────────────▼──────────────────────────────┐
│              PostgreSQL Database (Neon)                      │
│  Sessions │ Users │ Programs │ Check-ins │ Consents         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Tech Stack

#### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool, dev server |
| React Router | 6.x | Client-side routing |
| Tailwind CSS | 3.x | Styling |
| Framer Motion | 10.x | Animations |
| Leaflet | 1.x | Interactive maps |
| Recharts | 2.x | Data visualization |
| i18next | 23.x | Internationalization |

#### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Express.js | 4.x | HTTP server |
| Drizzle ORM | 0.30.x | Type-safe database queries |
| connect-pg-simple | 9.x | PostgreSQL session store |
| bcrypt | 5.x | Password hashing |
| Nodemailer | 6.x | Email (Gmail SMTP) |
| pino | 8.x | Structured logging |

#### Database & Infrastructure

| Technology | Purpose |
|------------|---------|
| Neon PostgreSQL | Primary database |
| Replit | Hosting (Autoscale deployment) |
| Replit AI | Ximi AI companion (OpenAI-compatible) |

#### PWA & Mobile

| Technology | Purpose |
|------------|---------|
| vite-plugin-pwa | Service worker, manifest |
| Workbox | Caching strategies |
| Capacitor | iOS/Android native wrapper |

### 5.3 Project Structure

```
room-xi-connect/
├── server/                      # Backend
│   ├── index.js                 # Express server entry
│   ├── schema.ts                # Drizzle database schema
│   ├── routes/                  # API route handlers
│   │   ├── auth.js              # Authentication
│   │   ├── checkins.js          # Mood check-ins
│   │   ├── programs.js          # Program discovery
│   │   ├── ximi.ts              # AI companion
│   │   ├── safetyPlans.ts       # Safety plans
│   │   └── admin.js             # Admin dashboard
│   ├── services/                # Business logic
│   │   ├── ximi.ts              # Ximi AI service
│   │   ├── streak.ts            # Streak calculation
│   │   └── email.js             # Email service
│   └── middleware/              # Express middleware
│       ├── accountLockout.ts    # Brute force protection
│       └── security.ts          # Security headers
├── src/                         # Frontend
│   ├── main.tsx                 # React entry point
│   ├── router.tsx               # Route definitions
│   ├── shell/                   # App shell & navigation
│   ├── routes/                  # Page components
│   │   ├── Home.tsx             # Dashboard
│   │   ├── Explore.tsx          # Program browser
│   │   ├── Me.tsx               # User profile
│   │   ├── SafetyPlan.tsx       # Safety plan editor
│   │   └── auth/                # Auth pages
│   ├── ui/                      # Reusable components
│   │   ├── home/                # Home components
│   │   ├── explore/             # Explore components
│   │   └── crisis/              # Crisis components
│   └── lib/                     # Utilities
│       ├── api.ts               # API client
│       ├── session.tsx          # Session management
│       └── queue.ts             # Offline queue
├── public/                      # Static assets
├── docs/                        # Documentation
└── tests/                       # Test suites
```

### 5.4 API Naming Convention

| Direction | Format | Example |
|-----------|--------|---------|
| API Request Bodies | snake_case | `{ mood_level: 4, affect_tags: [...] }` |
| API Response Bodies | camelCase | `{ moodLevel16: 4, affectTags: [...] }` |
| Database Columns | snake_case | `mood_level_1_6`, `affect_tags` |
| TypeScript Interfaces | camelCase | `moodLevel16`, `affectTags` |

---

## 6. User Flows

### 6.1 Guest Flow (Unauthenticated)

```
Landing Page (/auth/login)
    │
    ├─→ [Explore Programs] → Program Browser (public)
    │                            │
    │                            ├─→ List View
    │                            ├─→ Map View
    │                            └─→ Program Detail
    │
    ├─→ [Sign In] → Login Form
    │
    └─→ [Create Account] → Registration
                              │
                              ├─→ Age Check
                              │     │
                              │     ├─→ 16+ → Direct Registration
                              │     └─→ 13-15 → Guardian Consent Flow
                              │
                              └─→ Onboarding → Home Dashboard
```

### 6.2 Authenticated User Flow

```
Home Dashboard (/home)
    │
    ├─→ Mood Orb → Check-In Form (3 steps)
    │                  │
    │                  ├─→ Step 1: Select Mood (1-6)
    │                  ├─→ Step 2: Wellness Dimensions
    │                  └─→ Step 3: Optional Note
    │
    ├─→ Quick Actions
    │     ├─→ Get Help → Crisis Sheet
    │     ├─→ Find Programs → Explore
    │     └─→ Journal → Journal Page
    │
    ├─→ Ximi Button → AI Chat Overlay
    │
    └─→ Bottom Navigation
          ├─→ Home
          ├─→ Explore (Programs/Map/Saved)
          ├─→ QR (Scanner)
          └─→ Me (Profile/Settings)
```

### 6.3 Guardian Consent Flow (Ages 13-15)

```
Youth Registration
    │
    └─→ Age < 16 Detected
          │
          └─→ Guardian Email Requested
                │
                └─→ Email Plus Flow (2-Step)
                      │
                      ├─→ Step 1: Consent Notice Email
                      │     └─→ Guardian Clicks Link
                      │           └─→ Views Full Consent Notice
                      │                 └─→ Clicks "I Agree"
                      │
                      └─→ Step 2: Confirmation Email
                            └─→ Guardian Clicks Confirm Link
                                  └─→ Account Activated
                                        └─→ Youth Notified
```

### 6.4 Safety Plan Flow

```
Me Page (/me)
    │
    └─→ Safety Plan Card
          │
          └─→ Create/Edit Safety Plan (/safety-plan)
                │
                ├─→ 7 Sections (Guided)
                │     ├─→ Warning Signs
                │     ├─→ Coping Steps
                │     ├─→ Safe Places
                │     ├─→ Trusted Contacts
                │     ├─→ Professional Support
                │     ├─→ Escalation Steps
                │     └─→ Notes for Others
                │
                ├─→ Save Plan
                │
                └─→ Share Options
                      ├─→ Generate Link (expiry: 7-90 days)
                      ├─→ Generate QR Code
                      └─→ Revoke Access
```

---

## 7. Database Schema

### 7.1 Entity Relationship Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │────<│   profiles   │     │   programs   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       │                                         │
       ▼                                         ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   consents   │     │   checkins   │     │saved_programs│
└──────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       ▼                                         │
┌──────────────┐     ┌──────────────┐            │
│consent_events│     │    xids      │────────────┘
└──────────────┘     └──────────────┘
                           │
                           ▼
                     ┌──────────────┐
                     │  attendance  │
                     └──────────────┘
```

### 7.2 Core Tables

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Unique email address |
| password_hash | TEXT | bcrypt hash |
| email_verified | BOOLEAN | Email verification status |
| created_at | TIMESTAMP | Account creation date |

#### profiles
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | FK to users |
| first_name | TEXT | Display name |
| age | INTEGER | Age in years |
| streak_count | INTEGER | Current check-in streak |
| ximi_consent | BOOLEAN | AI companion consent |
| is_admin | BOOLEAN | Admin role flag |

#### checkins
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| checkin_date | DATE | Date (one per day) |
| mood_level_1_6 | INTEGER | Mood level (1-6) |
| mood_type | TEXT | Mood name (cold, stormy, etc.) |
| affect_tags | TEXT[] | Emotional tags |
| wellness_dimensions | TEXT[] | SAMHSA dimensions |
| note | TEXT | Optional reflection |
| crisis_flagged | BOOLEAN | Crisis detected |

#### programs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Program name |
| description | TEXT | Short description |
| organizer | TEXT | Organization name |
| tags | TEXT[] | Category tags |
| free | BOOLEAN | Cost indicator |
| location_name | TEXT | Venue name |
| lat/lng | TEXT | Coordinates |
| next_start | TIMESTAMP | Next occurrence |

#### consents
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | FK to users |
| consent_type | TEXT | Type (terms_of_use, privacy_notice, etc.) |
| value | BOOLEAN | Consent granted |
| text_version | TEXT | Version of consent text |
| updated_at | TIMESTAMP | Last update |

#### safety_plans
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| data | JSONB | Plan content (7 sections) |
| version | INTEGER | Version number |
| share_token_hash | TEXT | Hashed share token |
| share_expires_at | TIMESTAMP | Link expiration |

### 7.3 Consent Types

| Type | Purpose | Required For |
|------|---------|--------------|
| terms_of_use | Terms acceptance | Account creation |
| privacy_notice | Privacy policy | Account creation |
| data_collection | Data collection consent | Check-ins |
| ai_personalization | Ximi AI consent | AI features |
| location | Location sharing | Nearby programs |
| research | Research participation | Aggregated insights |

---

## 8. API Reference

### 8.1 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Create account | No |
| POST | /api/auth/login | Sign in | No |
| POST | /api/auth/logout | Sign out | Yes |
| GET | /api/auth/user | Get current user | Yes |
| POST | /api/auth/reset-password | Request reset | No |
| POST | /api/auth/update-password | Change password | Yes |
| DELETE | /api/auth/delete-account | Delete account | Yes |

### 8.2 Profile

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/profile | Get user profile | Yes |
| PUT | /api/profile | Update profile | Yes |
| GET | /api/profile/streak | Get streak info | Yes |

### 8.3 Check-ins

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/checkins | Create check-in | Yes |
| GET | /api/checkins | List check-ins | Yes |
| GET | /api/checkins/today | Today's check-in | Yes |

### 8.4 Programs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/programs | List all programs | No |
| GET | /api/programs/:id | Get program details | No |
| GET | /api/programs/saved | List saved programs | Yes |
| POST | /api/programs/saved | Save program | Yes |
| DELETE | /api/programs/saved/:id | Unsave program | Yes |

### 8.5 Events

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/events | List events | No |
| GET | /api/events/happening-now | Current events | No |

### 8.6 Ximi AI

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/ximi/chat | Send message | Yes |
| POST | /api/ximi/consent | Grant/revoke consent | Yes |
| GET | /api/ximi/conversations | Get history | Yes |
| GET | /api/ximi/trends | Mood trends | Yes |

### 8.7 Safety Plans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/safety-plan | Get user's plan | Yes |
| PUT | /api/safety-plan | Create/update plan | Yes |
| POST | /api/safety-plan/share | Generate share link | Yes |
| DELETE | /api/safety-plan/share | Revoke share link | Yes |
| GET | /api/safety-plan/share/:token | Public view | No |

### 8.8 Crisis

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/crisis | Get crisis resources | No |

---

## 9. Security & Privacy

### 9.1 Compliance Frameworks

| Framework | Jurisdiction | Status |
|-----------|--------------|--------|
| PIPA | Alberta | Compliant |
| PIPEDA | Federal (Canada) | Compliant |
| HIA | Alberta | Considerations applied |

### 9.2 Authentication Security

| Control | Implementation |
|---------|----------------|
| Password Hashing | bcrypt (12 rounds) |
| Session Storage | PostgreSQL (connect-pg-simple) |
| Session Timeout | 4 hours absolute, 30 min inactivity |
| Cookie Flags | httpOnly, secure (prod), sameSite: strict |
| Account Lockout | 5 failed attempts → 30 min lockout |
| Password Requirements | 12+ chars, upper, lower, number, special |

### 9.3 Data Protection

| Layer | Protection |
|-------|------------|
| At Rest | Neon PostgreSQL AES-256 encryption |
| In Transit | TLS 1.2+, HSTS enabled |
| Offline Queue | AES-GCM encryption (Web Crypto API) |
| Sensitive Fields | bcrypt hashing |

### 9.4 Consent System

**Two-Layer Consent:**
1. **Basic Consent:** Required for account (terms_of_use, privacy_notice, data_collection)
2. **Privacy Toggles:** Optional features (location, research, notifications)

**Guardian Consent (Ages 13-15):**
- Two-step "Email Plus" verification
- IP and User-Agent logging for audit
- Mature Minor Doctrine support (14+)

### 9.5 Crisis Detection

Keywords monitored in check-in notes and Ximi chat:
- suicide, kill myself, end my life
- self-harm, hurt myself
- hopeless, worthless, want to die

**Response:** Automatic display of crisis resources with hotline numbers.

### 9.6 Privacy Features

| Feature | Implementation |
|---------|----------------|
| XID | Non-identifying hashed identifier for attendance |
| Location Privacy | H3 Hex Bucketing with k-anonymity |
| Data Minimization | Only collect what's needed |
| Right to Delete | Account deletion removes all data |
| Audit Trail | All consent changes logged |

---

## 10. Design System

### 10.1 Color Palette - "Cosmic Garden"

| Color | Hex | Usage |
|-------|-----|-------|
| Cream | #F8F6F0 | Primary background |
| Deep Sage | #2D3748 | Primary text |
| Teal | #2EC489 | Primary accent, CTAs |
| Gold | #D4AF37 | Brand accent, streaks |
| Sage | #9CAF88 | Secondary elements |
| Coral | #FF6B6B | Alerts, warnings |
| Navy | #1A365D | Dark elements |

### 10.2 Mood Colors (HSL Gradient)

| Mood | Primary Color | Gradient Range |
|------|---------------|----------------|
| Cold | #93C5FD (Blue) | 200-220 hue |
| Stormy | #6B7280 (Slate) | 220-240 hue |
| Foggy | #D1D5DB (Gray) | 200-220 hue |
| Clear | #FCD34D (Yellow) | 40-50 hue |
| Breezy | #2EC489 (Teal) | 150-165 hue |
| Aurora | #C084FC (Purple/Gold) | 270-290 hue |

### 10.3 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Display Headings | Playfair Display | 700 | 24-48px |
| Body Text | Inter | 400-600 | 14-18px |
| Monospace | System Mono | 400 | 12-14px |

### 10.4 Key Components

**Mood Orb:**
- Canvas-based gradient animation
- 8-second breathing animation loop
- HSL color interpolation
- Accessibility patterns for colorblind users

**Bottom Navigation:**
- 4 tabs: Home, Explore, QR, Me
- Active state with teal highlight
- Guest mode shows: Explore, Sign In

**Crisis Sheet:**
- Bottom sheet modal
- One-tap phone links
- Always accessible via "Get Help"

---

## 11. Testing & Quality Assurance

### 11.1 Testing Infrastructure

| Type | Framework | Coverage |
|------|-----------|----------|
| Unit Tests | Vitest | 94 tests |
| API E2E Tests | Playwright | 124 tests |
| Browser E2E | Playwright | Skipped in CI |
| Privacy Smoke | Custom | Consent enforcement |

### 11.2 Test Suites

| Suite | Description |
|-------|-------------|
| server/__tests__/auth.test.ts | Authentication flows |
| server/__tests__/recommendations.test.ts | Mood-based recommendations |
| server/__tests__/accountLockout.test.ts | Brute force protection |
| server/__tests__/security.integration.test.ts | Security controls |
| tests/e2e/ximi-chat.spec.ts | Ximi AI endpoints |
| tests/e2e/guardian-consent.spec.ts | Guardian verification |

### 11.3 Quality Checks

- ESLint + TypeScript strict mode
- Prettier for code formatting
- LSP diagnostics (zero errors)
- Lighthouse PWA audit
- WCAG 2.1 AA accessibility audit

---

## 12. Deployment & Infrastructure

### 12.1 Hosting

| Component | Provider | Type |
|-----------|----------|------|
| Application | Replit | Autoscale deployment |
| Database | Neon | Managed PostgreSQL |
| AI | Replit AI | OpenAI-compatible API |
| Email | Gmail SMTP | Nodemailer |

### 12.2 Environment Variables

**Required:**
| Variable | Description |
|----------|-------------|
| DATABASE_URL | Neon PostgreSQL connection |
| SESSION_SECRET | Session encryption key |
| SAFETY_PLAN_TOKEN_PEPPER | Token hashing pepper |

**Optional:**
| Variable | Description |
|----------|-------------|
| GMAIL_USER | Email sender address |
| GMAIL_APP_PASSWORD | Gmail app password |
| VAPID_PUBLIC_KEY | Push notification key |
| VAPID_PRIVATE_KEY | Push notification key |

### 12.3 Deployment Commands

```bash
# Build
npm run build

# Database sync
npm run db:push

# Start production
npm run start
```

### 12.4 Deployment Checklist

- [ ] All tests passing (94 unit + 124 API)
- [ ] No LSP errors
- [ ] Environment secrets configured
- [ ] Database schema synced
- [ ] Email service verified
- [ ] Crisis resources up-to-date
- [ ] SSL/TLS enabled
- [ ] HSTS configured

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial release |

---

**Copyright © 2026 Room 11 Foundation. All rights reserved.**

*Built with care for youth mental health and wellness.*
