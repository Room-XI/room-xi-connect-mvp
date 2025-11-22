# Room XI Connect - Architecture Documentation

This document provides a comprehensive overview of Room XI Connect's architecture, including screen wireframes, component structure, data flow, and technical implementation details.

## Table of Contents
1. [System Overview](#system-overview)
2. [Application Structure](#application-structure)
3. [Screen Wireframes & User Flows](#screen-wireframes--user-flows)
4. [Component Architecture](#component-architecture)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Authentication & Session Management](#authentication--session-management)
9. [Offline Support](#offline-support)
10. [Privacy & Compliance](#privacy--compliance)

---

## System Overview

### Architecture Pattern
Room XI Connect uses a modern full-stack architecture:
- **Frontend**: React SPA with TypeScript
- **Backend**: Express.js REST API
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **Authentication**: Session-based with PostgreSQL storage
- **Deployment**: Replit Autoscale

### Tech Stack Summary
```
┌─────────────────────────────────────────┐
│         React Frontend (SPA)            │
│   React Router │ Tailwind │ Vite        │
└─────────────────┬───────────────────────┘
                  │ HTTP/REST API
┌─────────────────▼───────────────────────┐
│         Express.js Backend              │
│   Session Auth │ Drizzle ORM           │
└─────────────────┬───────────────────────┘
                  │ SQL
┌─────────────────▼───────────────────────┐
│       PostgreSQL Database (Neon)        │
│   Sessions │ Users │ Programs │ etc.   │
└─────────────────────────────────────────┘
```

---

## Application Structure

### Directory Organization

```
room-xi-connect/
├── server/                      # Backend (Express + Drizzle)
│   ├── index.js                # Server entry, middleware, routes
│   ├── schema.ts               # Drizzle database schema
│   ├── seed.ts                 # Database seeding
│   └── routes/                 # API route handlers
│       ├── auth.js            # /api/auth/*
│       ├── profile.js         # /api/profile
│       ├── checkins.js        # /api/checkins
│       ├── programs.js        # /api/programs/*
│       ├── xid.js             # /api/xid
│       └── crisis.js          # /api/crisis
│
├── src/                         # Frontend (React)
│   ├── main.tsx                # React app entry
│   ├── shell/                  # App shell & navigation
│   │   ├── App.tsx            # Main router & layout
│   │   └── Navigation.tsx     # Bottom nav bar
│   ├── routes/                 # Page components (screens)
│   │   ├── Home.tsx           # Dashboard
│   │   ├── Explore.tsx        # Program browser
│   │   ├── Me.tsx             # User profile
│   │   ├── Settings.tsx       # User settings
│   │   ├── Journal.tsx        # Check-in history
│   │   ├── ProgramDetail.tsx  # Program details
│   │   ├── QR.tsx             # QR check-in scanner
│   │   ├── auth/              # Auth pages
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Reset.tsx
│   │   │   └── UpdatePassword.tsx
│   │   ├── org/               # Organization portal
│   │   │   └── Dashboard.tsx
│   │   └── Admin.tsx          # Admin panel
│   ├── ui/                     # Reusable components
│   │   ├── home/              # Home screen components
│   │   │   ├── MoodOrb.tsx
│   │   │   ├── CheckInForm.tsx
│   │   │   ├── SuggestedPrograms.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── explore/           # Program discovery
│   │   │   ├── ProgramCard.tsx
│   │   │   ├── ProgramList.tsx
│   │   │   ├── ProgramMap.tsx
│   │   │   └── SavedList.tsx
│   │   ├── crisis/            # Crisis support
│   │   │   └── CrisisSheet.tsx
│   │   └── me/                # Profile components
│   │       └── Sparkline.tsx
│   └── lib/                    # Utilities & helpers
│       ├── api.ts             # API client
│       ├── session.tsx        # Session provider
│       └── queue.ts           # Offline sync queue
│
└── public/                      # Static assets
    ├── manifest.json           # PWA manifest
    └── icons/                  # App icons
```

---

## Screen Wireframes & User Flows

### 1. Guest Flow (Unauthenticated)

#### Landing Page (`/auth/login`)
```
┌────────────────────────────────────────┐
│  [Donate ❤️]                          │ ← Fixed top-right
├────────────────────────────────────────┤
│                                        │
│  Room 11 Foundation                    │
│  "Your space. Your vibe. Your people." │
│                                        │
│  [Explore Programs]  [Sign In]        │
│                                        │
├────────────────────────────────────────┤
│  What We Do                            │
│  • Find Programs                       │
│  • Track Your Journey                  │
│  • Get Help                            │
├────────────────────────────────────────┤
│  [Learn More about Room 11] →          │
└────────────────────────────────────────┘
```

**User Actions:**
- Click "Explore Programs" → `/explore`
- Click "Sign In" → Scroll to sign-in form
- Click "Learn More" → `/about`

#### Program Browser (`/explore`) - Public
```
┌────────────────────────────────────────┐
│  🔍 Search programs...                 │
│  [List View] [Map View] [Saved]       │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐ │
│  │ Basketball Skills Development    │ │
│  │ by OTB Basketball                │ │
│  │ 📍 Allendale Community           │ │
│  │ 🆓 Free                          │ │
│  │ [❤️ Save]                        │ │ ← Login required
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ Art & Self-Expression Workshop   │ │
│  │ by CanManDan                     │ │
│  │ ...                              │ │
│  └──────────────────────────────────┘ │
├────────────────────────────────────────┤
│  [🏠] [Explore] [Sign In] [Me]        │ ← Bottom nav (guest)
└────────────────────────────────────────┘
```

**User Actions:**
- Click program card → `/program/:id` (public detail view)
- Click "Save" → Redirect to `/auth/login`
- Click "Map View" → `/explore/map` (public map)
- Click "Saved" → Show login prompt

---

### 2. Authenticated User Flow

#### Home Dashboard (`/home`)
```
┌────────────────────────────────────────┐
│  Good morning, Alex! 👋                │
│  Streak: 5 days 🔥                     │
├────────────────────────────────────────┤
│          ┌──────────┐                  │
│          │  Mood    │                  │
│          │   Orb    │  ← Interactive   │
│          │ (Calm)   │     breathing    │
│          └──────────┘                  │
│                                        │
│  "How are you feeling today?"         │
│  [✨ Check In]                         │
├────────────────────────────────────────┤
│  Last Check-in: Today at 9:30 AM      │
│  Mood: Calm • Grateful                │
├────────────────────────────────────────┤
│  Suggested Programs                    │
│  ┌────────────────────────────┐       │
│  │ Basketball @ 6 PM          │       │
│  └────────────────────────────┘       │
├────────────────────────────────────────┤
│  Quick Actions                         │
│  [🆘 Get Help] [📍 Find Programs]     │
├────────────────────────────────────────┤
│  [Home] [Explore] [QR] [Me]           │ ← Bottom nav (auth)
└────────────────────────────────────────┘
```

**User Actions:**
- Click "Check In" → Open CheckInForm modal
- Click Mood Orb → Open CheckInForm modal
- Click suggested program → `/program/:id`
- Click "Get Help" → Open CrisisSheet

#### Check-In Modal (CheckInForm)
```
┌────────────────────────────────────────┐
│  How are you feeling?                  │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  [😊] [😐] [😔] [😢] [😰] [🙂]  │ │
│  │  Joyful Calm Sad Down Anxious OK │ │
│  └──────────────────────────────────┘ │
│                                        │
│  What else? (Pick all that apply)     │
│  [Grateful] [Tired] [Hopeful]         │
│  [Lonely] [Proud] [Worried] ...       │
│                                        │
│  📝 Notes (optional):                  │
│  ┌──────────────────────────────────┐ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Cancel] [Save Check-in]             │
└────────────────────────────────────────┘
```

**Data Captured:**
- Mood level (1-6 scale)
- Affect tags (multiple selection)
- Optional text note
- Timestamp
- Local timezone

#### Program Detail (`/program/:id`)
```
┌────────────────────────────────────────┐
│  [← Back]                  [Share] [❤️]│
├────────────────────────────────────────┤
│  Basketball Skills Development         │
│  by OTB Basketball                     │
│                                        │
│  📍 Allendale Community League         │
│  🕐 Fridays, 6-8 PM                    │
│  🆓 Free                               │
│  🏠 Indoor                             │
│  ♿ Wheelchair accessible              │
├────────────────────────────────────────┤
│  About this program:                   │
│  Learn fundamental basketball skills   │
│  in a supportive, trauma-informed...   │
│                                        │
│  Tags:                                 │
│  [Sports] [Team] [All Ages]           │
├────────────────────────────────────────┤
│  [Get Directions] [Save Program]      │
└────────────────────────────────────────┘
```

**User Actions:**
- Click "Back" → Return to `/explore`
- Click "Share" → Native share sheet
- Click "❤️" → Save/unsave program
- Click "Get Directions" → Open Google Maps
- Click "Save Program" → Add to saved list

#### Me (Profile) (`/me`)
```
┌────────────────────────────────────────┐
│  Alex Chen                             │
│  XID: X-AB1234                         │
│  Member since Oct 2025                 │
├────────────────────────────────────────┤
│  Your Stats                            │
│  ┌────────────────┐  ┌──────────────┐ │
│  │ 5-day streak  │  │ 12 check-ins│ │
│  │ 🔥            │  │ ✨          │ │
│  └────────────────┘  └──────────────┘ │
│  ┌────────────────┐  ┌──────────────┐ │
│  │ 3 programs    │  │ 45 XP       │ │
│  │ attended      │  │ 💎          │ │
│  └────────────────┘  └──────────────┘ │
├────────────────────────────────────────┤
│  Mood Sparkline (last 30 days)        │
│  ┌──────────────────────────────────┐ │
│  │  /\/\  /\    /\  /\/\           │ │
│  └──────────────────────────────────┘ │
├────────────────────────────────────────┤
│  Recent Activity                       │
│  • Check-in today at 9:30 AM          │
│  • Attended Basketball (Fri)          │
│  • Saved Art Workshop                 │
├────────────────────────────────────────┤
│  [View Journal] [⚙️ Settings]          │
└────────────────────────────────────────┘
```

**User Actions:**
- Click "View Journal" → `/journal`
- Click "Settings" → `/settings`
- Tap XID → Copy to clipboard

#### Settings (`/settings`)
```
┌────────────────────────────────────────┐
│  Settings                              │
├────────────────────────────────────────┤
│  Account                               │
│  > Update profile                      │
│  > Change password                     │
│  > Privacy & consent                   │
├────────────────────────────────────────┤
│  Preferences                           │
│  > Notifications         [Toggle]     │
│  > Dark mode            [Toggle]      │
├────────────────────────────────────────┤
│  App                                   │
│  > Install app                         │
│  > Offline data (3 items queued)      │
│  > About Room XI Connect              │
├────────────────────────────────────────┤
│  Support                               │
│  > Crisis resources                    │
│  > Contact support                     │
│  > Feedback                            │
├────────────────────────────────────────┤
│  [Sign Out]                            │
│  [Delete Account]                      │
└────────────────────────────────────────┘
```

#### QR Code Scanner (`/qr`)
```
┌────────────────────────────────────────┐
│  [← Back]          Check In            │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐ │
│  │                                  │ │
│  │        [QR Camera View]          │ │
│  │                                  │ │
│  │     ┌──────────────────┐        │ │
│  │     │  Scan area       │        │ │
│  │     │                  │        │ │
│  │     └──────────────────┘        │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Point your camera at the program's   │
│  QR code to check in                  │
│                                        │
│  Your XID: X-AB1234                   │
└────────────────────────────────────────┘
```

**After successful scan:**
```
┌────────────────────────────────────────┐
│  ✅ Checked In!                        │
│                                        │
│  Basketball Skills Development         │
│  Friday, Oct 29 at 6:00 PM            │
│                                        │
│  +10 XP earned                         │
│                                        │
│  [View Program] [Done]                │
└────────────────────────────────────────┘
```

#### Crisis Support Sheet
```
┌────────────────────────────────────────┐
│  [×]                 Get Help          │
├────────────────────────────────────────┤
│  If you're in crisis, you're not alone│
│                                        │
│  24/7 Crisis Support                   │
│  ┌──────────────────────────────────┐ │
│  │ 🆘 Crisis Hotline                │ │
│  │    1-800-XXX-XXXX                │ │
│  │    [Call Now]                    │ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ 💬 Crisis Text Line              │ │
│  │    Text HOME to 741741           │ │
│  │    [Open Messages]               │ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ 🌐 Kids Help Phone               │ │
│  │    1-800-668-6868                │ │
│  │    [Call Now]                    │ │
│  └──────────────────────────────────┘ │
├────────────────────────────────────────┤
│  Local Resources                       │
│  • Alberta Health Services            │
│  • Youth Mental Health Support        │
│  • Indigenous Support Services        │
└────────────────────────────────────────┘
```

---

## Component Architecture

### Core Components

#### 1. App Shell (`src/shell/`)

**App.tsx** - Main router and layout
```tsx
<SessionProvider>
  <Router>
    <Routes>
      {/* Public routes */}
      <Route path="/auth/login" element={<Login />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/program/:id" element={<ProgramDetail />} />
      
      {/* Protected routes */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/me" element={<ProtectedRoute><Me /></ProtectedRoute>} />
      {/* ... */}
    </Routes>
    <Navigation />
  </Router>
</SessionProvider>
```

**Navigation.tsx** - Bottom navigation
- Shows context-aware nav items
- Guest: [Explore, Sign In]
- Authenticated: [Home, Explore, QR, Me]
- Highlights active route

#### 2. Session Management (`src/lib/session.tsx`)

**SessionProvider** - Global session state
```tsx
interface SessionContext {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Features:**
- Check session on mount (`/api/auth/session`)
- Persist session state across refreshes
- Auto-refresh on navigation
- Provide user context to all components

#### 3. API Client (`src/lib/api.ts`)

**Centralized API communication**
```typescript
const api = {
  auth: {
    register: (email, password, ...) => POST /api/auth/register
    login: (email, password) => POST /api/auth/login
    logout: () => POST /api/auth/logout
    // ...
  },
  profile: {
    get: () => GET /api/profile
    update: (data) => PUT /api/profile
  },
  checkins: {
    create: (data) => POST /api/checkins
    list: () => GET /api/checkins
  },
  programs: {
    list: () => GET /api/programs
    get: (id) => GET /api/programs/:id
    saved: {
      list: () => GET /api/programs/saved
      add: (id) => POST /api/programs/saved
      remove: (id) => DELETE /api/programs/saved/:id
    }
  },
  xid: {
    generate: () => GET /api/xid
    getAttendance: () => GET /api/xid/attendance
  },
  crisis: {
    getResources: () => GET /api/crisis
  }
}
```

**Response Format:**
```typescript
{
  data: T | null,
  error: string | null
}
```

#### 4. Offline Queue (`src/lib/queue.ts`)

**IndexedDB-based offline sync**
```typescript
interface QueueItem {
  id: string;
  type: 'save_program' | 'unsave_program' | 'checkin';
  payload: any;
  timestamp: number;
  attempts: number;
}

// Functions
addToQueue(type, payload)
processQueue()  // Auto-retry pending items
clearQueue()    // Delete all queued items
```

**Usage:**
```tsx
// Offline-first save
try {
  await api.programs.saved.add(programId);
} catch (error) {
  await addToQueue('save_program', { program_id: programId });
}
```

#### 5. Page Components (`src/routes/`)

**Home.tsx** - Dashboard
- Displays MoodOrb
- Shows last check-in
- Displays streak count
- Lists suggested programs
- Quick action buttons

**Explore.tsx** - Program browser
- Search bar (future)
- Tab navigation (List, Map, Saved)
- ProgramList component
- Available to guests

**Me.tsx** - User profile
- User stats (streak, check-ins, attendance, XP)
- Mood sparkline
- Recent activity feed
- Navigation to journal/settings

**Settings.tsx** - User settings
- Account management
- Preferences (notifications, dark mode)
- App info (install, offline data)
- Support links
- Sign out / delete account

**QR.tsx** - QR scanner
- Camera permissions
- QR code scanning
- Success/error feedback
- XID display

#### 6. UI Components (`src/ui/`)

**home/MoodOrb.tsx** - Breathing mood orb
- Animated SVG orb
- Color-coded moods
- Breathing animation
- Click to check in

**home/CheckInForm.tsx** - Check-in modal
- Mood level selection (1-6)
- Affect tags (multiple selection)
- Optional note textarea
- Submits to `/api/checkins`

**home/SuggestedPrograms.tsx** - Program suggestions
- Lists 3 featured programs
- Links to `/explore`

**explore/ProgramCard.tsx** - Program card
- Program title, organizer, location
- Tags, cost, schedule
- Save/unsave button
- Links to `/program/:id`

**explore/ProgramList.tsx** - Scrollable program list
- Maps over programs array
- Renders ProgramCard for each
- Loading skeleton

**explore/ProgramMap.tsx** - Interactive map
- Leaflet map with markers
- Program popups
- Filters programs with coordinates

**explore/SavedList.tsx** - Saved programs
- Lists user's bookmarked programs
- Empty state prompt
- Sign-in prompt for guests

**crisis/CrisisSheet.tsx** - Crisis support
- Modal/sheet overlay
- Lists crisis resources
- Phone/text/web links
- Always accessible

**me/Sparkline.tsx** - Mood trend chart
- Recharts line chart
- Last 30 check-ins
- Mood level visualization

---

## Data Flow

### 1. Authentication Flow

```
User enters credentials
        ↓
   Login.tsx
        ↓
   api.auth.login(email, password)
        ↓
   POST /api/auth/login
        ↓
   bcrypt.compare(password, hash)
        ↓
   req.session.user = { id, email, ... }
        ↓
   res.json({ data: user })
        ↓
   SessionProvider updates context
        ↓
   Navigate to /home
```

### 2. Check-In Flow

```
User clicks Mood Orb or "Check In" button
        ↓
   CheckInForm modal opens
        ↓
   User selects mood + tags + note
        ↓
   api.checkins.create(data)
        ↓
   POST /api/checkins
        ↓
   Insert into checkins table
   Update profile.streak_count if applicable
        ↓
   res.json({ data: checkin })
        ↓
   Modal closes, Home refreshes
        ↓
   Updated streak displayed
```

### 3. Program Discovery Flow

```
User navigates to /explore
        ↓
   Explore.tsx loads
        ↓
   useEffect calls api.programs.list()
        ↓
   GET /api/programs
        ↓
   SELECT * FROM programs
        ↓
   res.json({ data: programs })
        ↓
   ProgramList renders ProgramCard[]
        ↓
   User clicks program card
        ↓
   Navigate to /program/:id
        ↓
   ProgramDetail loads program details
```

### 4. Save Program Flow (Online)

```
User clicks "Save" button on ProgramCard
        ↓
   toggleSave() called
        ↓
   api.programs.saved.add(programId)
        ↓
   POST /api/programs/saved
        ↓
   INSERT INTO saved_programs (user_id, program_id)
        ↓
   res.json({ data: { success: true } })
        ↓
   setIsSaved(true)
        ↓
   Button updates to "Saved" with filled heart
```

### 5. Save Program Flow (Offline)

```
User clicks "Save" button (no network)
        ↓
   toggleSave() called
        ↓
   api.programs.saved.add(programId) fails
        ↓
   catch block: addToQueue('save_program', payload)
        ↓
   Item added to IndexedDB queue
        ↓
   setIsSaved(true) optimistically
        ↓
   Button shows "Saved" + offline indicator
        ↓
   [When network returns]
        ↓
   processQueue() auto-runs
        ↓
   POST /api/programs/saved (retried)
        ↓
   Queue item removed on success
```

### 6. QR Check-In Flow

```
User navigates to /qr
        ↓
   QR.tsx requests camera permission
        ↓
   Camera stream displays
        ↓
   @zxing/browser scans QR code
        ↓
   Decoded: { programId: "123", sessionId: "abc" }
        ↓
   api.xid.getAttendance() to get user's XID
        ↓
   POST /api/attendance (future)
        ↓
   INSERT INTO attendance (xid, program_id, session_id)
        ↓
   res.json({ data: { success: true, xp: 10 } })
        ↓
   Show success modal with +10 XP
```

### 7. Crisis Support Flow

```
User clicks "Get Help" anywhere
        ↓
   CrisisSheet opens
        ↓
   api.crisis.getResources()
        ↓
   GET /api/crisis
        ↓
   SELECT * FROM crisis_resources
        ↓
   res.json({ data: resources })
        ↓
   Sheet displays phone/text/web resources
        ↓
   User clicks "Call Now"
        ↓
   window.location.href = 'tel:1-800-XXX-XXXX'
        ↓
   Native phone app opens
```

---

## Database Schema

### Key Tables

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### profiles
```sql
CREATE TABLE profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  preferred_name VARCHAR(100),
  age INTEGER,
  city VARCHAR(100),
  postal_code VARCHAR(10),
  streak_count INTEGER DEFAULT 0,
  last_checkin_date DATE,
  xp INTEGER DEFAULT 0,
  xid VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### checkins
```sql
CREATE TABLE checkins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  mood_level_1_6 INTEGER CHECK (mood_level_1_6 BETWEEN 1 AND 6),
  affect_tags TEXT[],
  note TEXT,
  local_tz VARCHAR(50)
);
```

#### programs
```sql
CREATE TABLE programs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  organizer VARCHAR(255),
  location_name VARCHAR(255),
  address VARCHAR(255),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  tags TEXT[],
  free BOOLEAN DEFAULT TRUE,
  cost_cents INTEGER,
  indoor BOOLEAN,
  outdoor BOOLEAN,
  accessibility_notes TEXT,
  next_start TIMESTAMP,
  next_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### saved_programs
```sql
CREATE TABLE saved_programs (
  user_id INTEGER REFERENCES users(id),
  program_id INTEGER REFERENCES programs(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, program_id)
);
```

#### crisis_resources
```sql
CREATE TABLE crisis_resources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'phone', 'text', 'web', 'local'
  contact VARCHAR(255),
  description TEXT,
  available_24_7 BOOLEAN DEFAULT FALSE,
  order_priority INTEGER
);
```

---

## API Reference

### Authentication Endpoints

#### POST /api/auth/register
Create a new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Doe",
  "preferredName": "JD",
  "age": 18,
  "city": "Edmonton"
}
```

**Response:**
```json
{
  "data": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe"
  },
  "error": null
}
```

#### POST /api/auth/login
Sign in with email and password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "data": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "Jane"
  },
  "error": null
}
```

**Session Cookie Set:**
```
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly; SameSite=Lax
```

#### POST /api/auth/logout
End the current session

**Response:**
```json
{
  "data": { "success": true },
  "error": null
}
```

#### GET /api/auth/session
Check if user is authenticated

**Response:**
```json
{
  "data": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "Jane"
  },
  "error": null
}
```

or

```json
{
  "data": null,
  "error": "Not authenticated"
}
```

### Profile Endpoints

#### GET /api/profile
Get current user's profile

**Response:**
```json
{
  "data": {
    "userId": 123,
    "firstName": "Jane",
    "lastName": "Doe",
    "preferredName": "JD",
    "age": 18,
    "city": "Edmonton",
    "streakCount": 5,
    "lastCheckinDate": "2025-10-29",
    "xp": 45,
    "xid": "X-AB1234"
  },
  "error": null
}
```

#### PUT /api/profile
Update profile

**Request:**
```json
{
  "firstName": "Jane",
  "preferredName": "JD"
}
```

**Response:**
```json
{
  "data": { "success": true },
  "error": null
}
```

### Check-In Endpoints

#### POST /api/checkins
Create a new check-in

**Request:**
```json
{
  "moodLevel16": 4,
  "affectTags": ["grateful", "calm"],
  "note": "Had a great day!",
  "localTz": "America/Edmonton"
}
```

**Response:**
```json
{
  "data": {
    "id": 456,
    "userId": 123,
    "timestamp": "2025-10-29T14:30:00Z",
    "moodLevel16": 4,
    "affectTags": ["grateful", "calm"],
    "note": "Had a great day!"
  },
  "error": null
}
```

#### GET /api/checkins
List user's check-ins

**Response:**
```json
{
  "data": [
    {
      "id": 456,
      "timestamp": "2025-10-29T14:30:00Z",
      "moodLevel16": 4,
      "affectTags": ["grateful", "calm"],
      "note": "Had a great day!"
    },
    ...
  ],
  "error": null
}
```

### Program Endpoints

#### GET /api/programs
List all programs

**Response:**
```json
{
  "data": [
    {
      "id": 789,
      "title": "Basketball Skills Development",
      "description": "Learn basketball fundamentals...",
      "organizer": "OTB Basketball",
      "locationName": "Allendale Community League",
      "address": "123 Main St",
      "lat": "53.5461",
      "lng": "-113.4938",
      "tags": ["sports", "team", "all-ages"],
      "free": true,
      "costCents": null,
      "indoor": true,
      "outdoor": false,
      "accessibilityNotes": "Wheelchair accessible",
      "nextStart": "2025-10-30T18:00:00Z",
      "nextEnd": "2025-10-30T20:00:00Z"
    },
    ...
  ],
  "error": null
}
```

#### GET /api/programs/:id
Get program details

**Response:** Same as single program object above

#### GET /api/programs/saved
List user's saved programs

**Response:** Array of program objects

#### POST /api/programs/saved
Save a program

**Request:**
```json
{
  "programId": 789
}
```

**Response:**
```json
{
  "data": { "success": true },
  "error": null
}
```

#### DELETE /api/programs/saved/:id
Unsave a program

**Response:**
```json
{
  "data": { "success": true },
  "error": null
}
```

### XID Endpoints

#### GET /api/xid
Get user's privacy-preserving XID

**Response:**
```json
{
  "data": {
    "xid": "X-AB1234"
  },
  "error": null
}
```

#### GET /api/xid/attendance
Get user's attendance history

**Response:**
```json
{
  "data": [
    {
      "programTitle": "Basketball Skills",
      "timestamp": "2025-10-25T18:00:00Z"
    },
    ...
  ],
  "error": null
}
```

### Crisis Endpoints

#### GET /api/crisis
Get crisis support resources

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Crisis Hotline",
      "type": "phone",
      "contact": "1-800-XXX-XXXX",
      "description": "24/7 crisis support",
      "available247": true
    },
    ...
  ],
  "error": null
}
```

---

## Authentication & Session Management

### Session Strategy
Room XI Connect uses **session-based authentication** instead of JWT tokens for enhanced security:

**Why Sessions?**
1. **Server-side revocation**: Sessions can be invalidated immediately
2. **No token storage**: Eliminates XSS risk from localStorage
3. **httpOnly cookies**: Prevents JavaScript access
4. **Automatic expiry**: Sessions expire server-side
5. **CSRF protection**: SameSite cookies prevent CSRF

### Session Configuration
```javascript
app.use(session({
  store: new pgSession({
    pool: dbPool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}));
```

### Session Middleware
```javascript
// Check authentication
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ data: null, error: 'Not authenticated' });
  }
  next();
}

// Usage
app.get('/api/profile', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  // ...
});
```

### Password Security
```javascript
// Registration
const hashedPassword = await bcrypt.hash(password, 10);

// Login
const match = await bcrypt.compare(password, user.password);
if (!match) {
  return res.status(401).json({ data: null, error: 'Invalid credentials' });
}
```

---

## Offline Support

### IndexedDB Queue System

**Purpose:** Allow users to interact with the app offline, syncing data when network returns

**Implementation:**
```typescript
// src/lib/queue.ts
const DB_NAME = 'roomxi-offline';
const STORE_NAME = 'queue';

interface QueueItem {
  id: string;
  type: 'save_program' | 'unsave_program' | 'checkin';
  payload: any;
  timestamp: number;
  attempts: number;
}

// Add item to queue
export async function addToQueue(type: string, payload: any) {
  const db = await openDB(DB_NAME, 1);
  const item: QueueItem = {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
    attempts: 0
  };
  await db.add(STORE_NAME, item);
}

// Process queue when online
export async function processQueue() {
  const db = await openDB(DB_NAME, 1);
  const items = await db.getAll(STORE_NAME);
  
  for (const item of items) {
    try {
      // Retry API call based on type
      if (item.type === 'save_program') {
        await api.programs.saved.add(item.payload.program_id);
      }
      // Success - remove from queue
      await db.delete(STORE_NAME, item.id);
    } catch (error) {
      // Increment attempts
      item.attempts++;
      await db.put(STORE_NAME, item);
    }
  }
}

// Auto-process on network change
window.addEventListener('online', processQueue);
```

**UI Indicators:**
```tsx
// Show queue count
const { itemCount } = useQueue();

{itemCount > 0 && (
  <div className="offline-notice">
    {itemCount} items queued for sync
  </div>
)}
```

### Service Worker (PWA)
```javascript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 // 1 hour
          }
        }
      }
    ]
  }
})
```

---

## Privacy & Compliance

### Alberta PIPA & HIA Compliance

**Key Requirements:**
1. **Consent Management**: Granular, revocable consent
2. **Data Minimization**: Only collect necessary data
3. **Breach Notification**: 72-hour OIPC reporting
4. **Access Controls**: Role-based permissions
5. **Audit Trails**: All data changes logged

### Two-Layer Consent System

**Layer 1: Account Creation (Required)**
- Name, age, city, email
- Terms of Use, Privacy Notice, Data Collection consent

**Layer 2: Safety Profile (Before Programs)**
- Legal names for emergency ID
- Emergency contact
- Health information (optional, HIA-compliant)
- Photo/media consent (5 separate toggles)
- Indigenous self-identification (optional, OCAP)

### Privacy-Preserving XIDs

**What**: Non-identifying codes for program attendance
**Format**: X-AB1234 (6 characters)
**Purpose**: Attendance tracking without revealing identity

**Implementation:**
```javascript
function generateXID() {
  const prefix = 'X-';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0, I/1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + code;
}
```

### Breach Notification System

**Tables:**
- `breach_events` - Incident tracking
- `breach_notifications` - OIPC/guardian notifications

**72-Hour Workflow:**
1. Breach detected/reported
2. Event logged with severity
3. Automatic notification triggers
4. Guardian emails sent (for affected minors)
5. OIPC notification prepared
6. Remediation tracking

---

## Future Enhancements

### Planned Features
- **Email Integration**: Password reset, guardian verification
- **Push Notifications**: Check-in reminders, program updates
- **Admin Dashboard**: Audit logs, user management, breach tracking
- **Organization Portal**: Program management, attendance reports
- **Journal Entries**: Extended check-in reflections
- **AI Companion (Ximi)**: Local heuristic chatbot for support

### API Endpoints to Implement
```
POST   /api/admin/audit-logs     - Admin audit trail
GET    /api/admin/stats          - Platform statistics
GET    /api/journal/entries      - User's journal entries
POST   /api/journal/entries      - Create journal entry
GET    /api/org/dashboard        - Org dashboard data
POST   /api/attendance           - QR check-in endpoint
```

---

## Development Guide

### Running Locally
```bash
npm install
npm run db:push    # Sync schema
npm run db:seed    # Add sample data
npm run dev        # Start server on :5000
```

### Adding a New API Endpoint

1. **Create route handler**
```javascript
// server/routes/newfeature.js
export default function newfeatureRoutes(app, db) {
  app.get('/api/newfeature', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const results = await db.select().from(schema.newfeature).where(eq(schema.newfeature.userId, userId));
    res.json({ data: results, error: null });
  });
}
```

2. **Register in server/index.js**
```javascript
import newfeatureRoutes from './routes/newfeature.js';
newfeatureRoutes(app, db);
```

3. **Add to API client**
```typescript
// src/lib/api.ts
export const api = {
  // ...
  newfeature: {
    list: () => fetchAPI('/api/newfeature'),
  }
}
```

4. **Use in component**
```tsx
const { data, error } = await api.newfeature.list();
```

### Adding a New Page

1. **Create page component**
```tsx
// src/routes/NewPage.tsx
export default function NewPage() {
  return <div>New Page</div>;
}
```

2. **Add route**
```tsx
// src/shell/App.tsx
<Route path="/new-page" element={<NewPage />} />
```

3. **Add navigation (optional)**
```tsx
// src/shell/Navigation.tsx
<Link to="/new-page">New Page</Link>
```

---

## Conclusion

This architecture provides a solid foundation for Room XI Connect's mission to support youth mental health. The combination of modern React patterns, secure session-based auth, offline-first design, and privacy compliance creates a safe, accessible platform for young people to connect, explore, and grow.

For questions or contributions, see the main [README.md](./README.md).
