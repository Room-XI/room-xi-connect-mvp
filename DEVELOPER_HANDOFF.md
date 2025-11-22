# Room XI Connect - Developer Handoff

**Version:** 1.2  
**Last Updated:** November 22, 2025  
**Maintainer:** Room XI Development Team

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Environment Setup](#environment-setup)
4. [Application Architecture](#application-architecture)
5. [Page-by-Page Documentation](#page-by-page-documentation)
6. [Core Systems](#core-systems)
7. [Database Schema](#database-schema)
8. [API Documentation](#api-documentation)
9. [Component Library](#component-library)
10. [Deployment Guide](#deployment-guide)
11. [Known Issues & Future Work](#known-issues--future-work)

---

## Project Overview

### What is Room XI Connect?

Room XI Connect is a youth mental health and wellness application designed for ages 13-25. It helps young people:
- Track their daily mood and wellness
- Discover local programs and community resources (98 real Edmonton programs)
- Access real-time event discovery ("Happening Now" finder)
- Access an AI companion (Ximi) for support
- Build healthy check-in habits through streaks
- Access crisis support when needed

### Key Features

- **6-Level Mood System**: Weather-metaphor mood tracking (Cold ❄️ → Aurora 🌌)
- **Daily Check-Ins**: Multi-step mood tracking with SAMHSA wellness dimensions
- **Real-Time Event Discovery**: 98 Edmonton programs with "Happening Now" filtering
- **Program Discovery**: Browse local programs with map view and geolocation
- **Ximi AI Companion**: Dual personality AI (Little Sibling + Peer Guide)
- **QR Attendance**: Quick check-in at programs via QR codes
- **Living Journal**: Private writing + AI-assisted reflection
- **Crisis Detection**: Real-time keyword scanning with safety resources
- **Admin Dashboard**: Analytics, monitoring, and audit logs (admin-only)
- **Offline Support**: IndexedDB queue for offline check-ins

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite 5 (build tool)
- React Router v6 (routing)
- Tailwind CSS (styling)
- Framer Motion (animations)
- Leaflet + React Leaflet (maps)
- IndexedDB via `idb` (offline storage)

**Backend:**
- Express.js (Node.js server)
- Neon PostgreSQL (database)
- Drizzle ORM (database queries)
- Session-based auth (express-session + connect-pg-simple)
- bcrypt (password hashing)

**AI Integration:**
- Replit AI (OpenAI-compatible API)
- Dual personality system (Little Sibling / Peer Guide)
- Crisis keyword detection

**PWA:**
- `vite-plugin-pwa` (service worker)
- Offline-first architecture
- Install prompt for mobile

---

## Quick Start Guide

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Replit account (for AI integration)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd room-xi-connect

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Development URLs

- **Frontend:** http://localhost:5000
- **Backend API:** http://localhost:5000/api
- **Database:** (via DATABASE_URL)

### Test Account

```
Email: test@roomxi.org
Password: Test1234!
```

---

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database

# Session Secret (change in production!)
SESSION_SECRET=your-secret-key-change-in-production

# Admin Credentials (use Replit Secrets in production)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$2b$10$sBta0wY/vBuS3KfbIOia7e4z8RpNJ3JS6Elj1ifnFk2C7kSPcg7aO  # bcrypt hash for 'admin123'

# AI Integration (OpenAI-compatible API - Replit AI)
AI_INTEGRATIONS_OPENAI_API_KEY=your-api-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1  # Or Replit AI endpoint

# Email (Gmail SMTP for guardian verification)
GMAIL_USER=roomxi.ent@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Optional: Map tiles
VITE_MAP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=&copy; OpenStreetMap contributors
```

### Database Setup (Neon PostgreSQL)

1. Create a Neon database at https://neon.tech
2. Copy the connection string to `DATABASE_URL`
3. Run `npm run db:push` to create tables
4. Seed programs (optional): `npm run seed:programs`

### AI Integration Setup

1. The app uses an OpenAI-compatible API for the Ximi companion (Replit AI recommended)
2. Add `AI_INTEGRATIONS_OPENAI_API_KEY` to environment variables
3. Add `AI_INTEGRATIONS_OPENAI_BASE_URL` (optional - defaults to OpenAI endpoint)
4. The server uses these credentials in `server/services/ximi.ts`

### Email Setup (Gmail SMTP)

Guardian verification emails are sent via Gmail SMTP when youth under 16 sign up:

1. **Gmail Account**: roomxi.ent@gmail.com (or create your own)
2. **App Password**: Generate at https://myaccount.google.com/apppasswords
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate new app password for "Mail"
   - Copy the 16-character password
3. **Environment Variables**:
   ```bash
   GMAIL_USER=roomxi.ent@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
4. **Implementation**: `server/services/email.js` uses `nodemailer` with Gmail SMTP
5. **Verification**: Server logs "✅ Email service ready (Gmail SMTP)" on startup

**Security Note**: Never commit app passwords to version control. Store in Replit Secrets or `.env` (gitignored).

---

## Application Architecture

### Project Structure

```
room-xi-connect/
├── src/                          # Frontend React app
│   ├── routes/                   # Page components
│   │   ├── Home.tsx              # Home page with MoodOrb
│   │   ├── Explore.tsx           # Program discovery
│   │   ├── Journal.tsx           # Living journal
│   │   ├── Me.tsx                # Profile page
│   │   └── QRScan.tsx            # QR scanner
│   ├── ui/                       # UI components
│   │   ├── home/                 # Home-specific components
│   │   │   ├── MoodOrb.tsx       # Central mood visualization
│   │   │   ├── CheckInForm.tsx   # 3-step check-in flow
│   │   │   └── QuickActions.tsx  # Action buttons
│   │   ├── explore/              # Explore-specific
│   │   │   ├── ProgramCard.tsx   # Program preview card
│   │   │   ├── ProgramList.tsx   # Scrollable program list
│   │   │   ├── ProgramMap.tsx    # Leaflet map view
│   │   │   └── XimiDock.tsx      # Floating AI assistant
│   │   └── crisis/
│   │       └── CrisisSheet.tsx   # Crisis support modal
│   ├── lib/                      # Utilities & services
│   │   ├── api.ts                # API client
│   │   ├── session.tsx           # Session management hook
│   │   ├── queue.ts              # Offline queue (IndexedDB)
│   │   ├── moodConfig.ts         # 6-level mood system
│   │   └── wellnessConfig.ts     # SAMHSA 8 dimensions
│   ├── shell/                    # App shell
│   │   ├── App.tsx               # Main app component & bottom nav
│   │   └── Tab.tsx               # Navigation tab component
│   └── router.tsx                # Route definitions
├── server/                       # Backend Express server
│   ├── index.js                  # Server entry point
│   ├── schema.ts                 # Drizzle database schema
│   ├── routes/                   # API routes
│   │   ├── auth.js               # Authentication endpoints
│   │   ├── checkins.js           # Check-in CRUD
│   │   ├── programs.js           # Program endpoints
│   │   └── ximi.ts               # Ximi AI chat
│   └── services/                 # Business logic
│       ├── ximi.ts               # Ximi AI service
│       └── streak.ts             # Streak calculation (DST-safe)
└── package.json
```

### Data Flow

```
User Action → React Component → API Client → Express Route → Database
                                                    ↓
                                            Update State (React)
```

**Example: Check-In Flow**

```
1. User clicks MoodOrb
2. CheckInForm modal opens (3 steps)
3. User selects mood + dimensions + note
4. Submit → api.checkins.create()
5. POST /api/checkins → Express route
6. Insert into checkins table
7. Update streak via streak service
8. Return updated data
9. Home page reloads → MoodOrb updates color
```

---

## Page-by-Page Documentation

### 1. Home Page (`/home`)

**Route:** `/home`  
**Access:** Authenticated users only  
**File:** `src/routes/Home.tsx`

**Purpose:** Central dashboard showing mood status, streak, and quick actions.

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ Good morning!                       │
│ 🔥 7 day streak                     │
├─────────────────────────────────────┤
│                                     │
│         ┌─────────┐                 │
│         │  Mood   │                 │
│         │   Orb   │                 │  ← Animated gradient orb
│         │  ☀️→🌫️ │                 │     Click to check in
│         └─────────┘                 │
│ How are you feeling today?          │
│ Tap the orb to check in             │
├─────────────────────────────────────┤
│ Recent Check-in                     │
│ Mood Level: 4/6 (Clear)             │
│ Tags: calm, focused                 │
│ "Feeling good after yoga class"    │
├─────────────────────────────────────┤
│ Quick Actions                       │
│ [📊 Check In] [📝 Journal]         │
│ [🎯 Programs]  [📞 Crisis]         │
├─────────────────────────────────────┤
│ Suggested Programs                  │
│ Based on your interests...          │
│ ┌─────────────────────────────────┐ │
│ │ 🎨 Art Workshop                 │ │
│ │ by YMCA • 📍 Downtown           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
      [🤖 Ximi] ← Floating AI button
```

**Key Components:**

1. **MoodOrb** (`src/ui/home/MoodOrb.tsx`)
   - Central animated sphere
   - Color changes based on mood (HSL gradients)
   - Breathing animation (8s loop)
   - Click opens CheckInForm

2. **CheckInForm** (`src/ui/home/CheckInForm.tsx`)
   - **Step 1:** Select mood (6 tokens: Cold → Aurora)
   - **Step 2:** Select wellness dimensions (1-3 from SAMHSA 8)
   - **Step 3:** Optional note (max 140 chars)
   - Crisis detection on note submission

3. **QuickActions** (`src/ui/home/QuickActions.tsx`)
   - 4 action buttons
   - Navigate to Journal, Programs, Crisis resources

4. **XimiDock** (`src/ui/explore/XimiDock.tsx`)
   - Floating button in bottom-right
   - Little Sibling personality mode
   - Opens chat overlay

**Data Sources:**
- `api.checkins.list()` → Last check-in for MoodOrb color
- `api.profile.get()` → Streak count

**State Management:**
```typescript
const [checkInOpen, setCheckInOpen] = useState(false);
const [lastCheckIn, setLastCheckIn] = useState<CheckIn | null>(null);
const [profile, setProfile] = useState<Profile | null>(null);
```

---

### 2. Explore Page (`/explore`, `/explore/map`, `/explore/saved`)

**Route:** `/explore` (public), `/explore/map`, `/explore/saved` (auth)  
**File:** `src/routes/Explore.tsx`

**Purpose:** Discover local programs with list, map, and saved views.

**Visual Layout (List View):**
```
┌─────────────────────────────────────┐
│ Explore                             │
│ Discover programs, events...        │
├─────────────────────────────────────┤
│ [ Programs ] [ Map ] [ Saved ]      │  ← Tab switcher
├─────────────────────────────────────┤
│ 🏷️ Filters: [All] [Free] [Indoor] │
│ Tags: Art, Sports, Music...         │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🎨 Art Workshop                 │ │
│ │ by YMCA of Northern Alberta     │ │
│ │ 📍 Downtown Community Center    │ │
│ │ Free • Indoor • Creative        │ │
│ │ [❤️ Save]              [View →]│ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ⚽ Basketball Training          │ │
│ │ by OTB Basketball               │ │
│ │ 📍 Allendale Community League   │ │
│ │ Free • Outdoor • Sports         │ │
│ │ [❤️ Save]              [View →]│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Visual Layout (Map View):**
```
┌─────────────────────────────────────┐
│ Explore                             │
├─────────────────────────────────────┤
│ [ Programs ] [ Map ] [ Saved ]      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │        🗺️ Leaflet Map          │ │
│ │                                 │ │
│ │    📍 ← Program markers         │ │
│ │  📍    📍                       │ │
│ │                                 │ │
│ │    📍        📍                 │ │
│ │                                 │ │
│ │ Click marker → popup with       │ │
│ │ program details + directions    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Components:**

1. **ExploreTabs** (`src/ui/explore/ExploreTabs.tsx`)
   - Segmented control: Programs | Map | Saved
   - Animated background on active tab
   - Saved tab only visible to authenticated users

2. **ProgramList** (`src/ui/explore/ProgramList.tsx`)
   - Loads all programs via `api.programs.list()`
   - Client-side filtering by tags, cost, environment
   - Grid layout of ProgramCard components

3. **ProgramCard** (`src/ui/explore/ProgramCard.tsx`)
   - Title, organizer, location
   - Tags (visual pills)
   - Save/unsave button (heart icon)
   - Click → navigate to `/program/:id`

4. **ProgramMap** (`src/ui/explore/ProgramMap.tsx`)
   - Leaflet MapContainer centered on Edmonton
   - Renders Marker for each program with lat/lng
   - Popup shows title, organizer, location, "View details" link

5. **SavedList** (`src/ui/explore/SavedList.tsx`)
   - Loads `api.programs.saved.list()`
   - Same card layout as ProgramList
   - Empty state: "No saved programs yet"

**Data Flow:**
```typescript
// Load programs
const { data: programs } = await api.programs.list();

// Filter client-side
const filtered = programs.filter(p => {
  if (filters.tags.length > 0) {
    return filters.tags.some(tag => p.tags.includes(tag));
  }
  if (filters.free) return p.free;
  if (filters.indoor) return p.indoor;
  return true;
});

// Save program
await api.programs.saved.add(programId);
```

**Guest vs Authenticated:**
- Guests can browse Programs and Map
- Only authenticated users can Save programs
- Saved tab only appears when authenticated

---

### 3. Program Detail Page (`/program/:id`)

**Route:** `/program/:id`  
**Access:** Public  
**File:** `src/routes/ProgramDetail.tsx`

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ ← Back to Explore                   │
├─────────────────────────────────────┤
│ 🎨 Art Workshop                     │
│ by YMCA of Northern Alberta         │
├─────────────────────────────────────┤
│ 📍 Downtown Community Center        │
│    123 Main St, Edmonton            │
│                                     │
│ 🕐 Schedule                         │
│    Mondays, 4:00 PM - 6:00 PM       │
│                                     │
│ 💰 Cost: Free                       │
│ 🏠 Environment: Indoor              │
│ 🏷️ Tags: Art, Creative, Youth      │
├─────────────────────────────────────┤
│ About this program:                 │
│                                     │
│ Join us for a creative art workshop │
│ where youth aged 13-18 can express  │
│ themselves through painting, drawing│
│ sculpture, and mixed media. No      │
│ experience necessary - all materials│
│ provided. Build confidence, make    │
│ friends, and discover your creative │
│ voice in a supportive environment.  │
├─────────────────────────────────────┤
│ Contact                             │
│ 📧 programs@ymca.org                │
│ 📞 (780) 555-1234                   │
├─────────────────────────────────────┤
│ [❤️ Save Program]  [📍 Directions] │
└─────────────────────────────────────┘
```

**Data Loading:**
```typescript
const { id } = useParams();
const { data: program } = await api.programs.get(id);
```

**Actions:**
- **Save/Unsave:** Toggles program in user's saved list
- **Get Directions:** Opens Google Maps with lat/lng

---

### 4. Journal Page (`/journal`)

**Route:** `/journal`  
**Access:** Authenticated users only  
**File:** `src/routes/Journal.tsx`

**Purpose:** Private journaling with optional AI peer guide.

**Visual Layout (Write Alone Mode):**
```
┌─────────────────────────────────────┐
│ Living Journal                      │
├─────────────────────────────────────┤
│ [ Write Alone ] [ Peer Guide ]      │  ← Mode toggle
├─────────────────────────────────────┤
│ How are you feeling?                │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│ │❄️│ │⛈️│ │🌫️│ │☀️│ │⚡│ │🌌││  ← 6 mood tokens
│ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘│
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ What's one thing that made you  │ │  ← Random prompt
│ │ smile today?                    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │  ← Text area
│ │ I had a great conversation with │ │
│ │ my friend after school. We      │ │
│ │ talked about our art projects   │ │
│ │ and made plans for the weekend. │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ 123 / 5000 characters  [Save Entry]│
└─────────────────────────────────────┘
```

**Visual Layout (Peer Guide Mode):**
```
┌─────────────────────────────────────┐
│ Living Journal                      │
├─────────────────────────────────────┤
│ [ Write Alone ] [ Peer Guide ]      │
├─────────────────────────────────────┤
│ How are you feeling?                │
│ [Mood selector - same 6 tokens]     │
├─────────────────────────────────────┤
│ Ximi - Peer Guide                   │
│ Here to journal with you            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Ximi: Hey, I'm here to journal  │ │
│ │ with you as your peer guide.    │ │
│ │ What's been on your mind lately?│ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ You: I've been feeling stressed │ │
│ │ about school and my grades      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Ximi: That sounds tough. What   │ │
│ │ specific part of school is      │ │
│ │ weighing on you most right now? │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ You: Math class. I don't        │ │
│ │ understand the new unit         │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Share what's on your mind...     ]│  ← Input
│ [Send] 45/500            [Finish  ]│
└─────────────────────────────────────┘
```

**Two Modes:**

**1. Write Alone:**
- Mood selector (6 tokens)
- Random writing prompt
- Large textarea (5000 char limit)
- Save button (stubbed - backend API not yet implemented)

**2. Peer Guide:**
- Same mood selector
- Conversation-style chat interface
- Calls `api.ximi.toggleMode('peer')` on entry
- Each message → `api.ximi.chat({ message })`
- Crisis detection still active
- "Finish Session" button saves and resets

**Mode Switching:**
```typescript
const handleModeChange = async (newMode: 'alone' | 'peer') => {
  if (newMode === 'peer') {
    await api.ximi.toggleMode('peer');
  } else {
    await api.ximi.toggleMode('sibling');
  }
  setMode(newMode);
  setMessages([]); // Clear conversation
};
```

**State Management:**
```typescript
const [mode, setMode] = useState<'alone' | 'peer'>('alone');
const [mood, setMood] = useState<MoodKey>('clear');
const [content, setContent] = useState(''); // Write Alone text
const [messages, setMessages] = useState<Message[]>([]); // Peer Guide chat
const [inputText, setInputText] = useState(''); // Peer Guide input
const [isTyping, setIsTyping] = useState(false); // AI response loading
```

---

### 5. QR Scan Page (`/qr`)

**Route:** `/qr`  
**Access:** Authenticated users only  
**File:** `src/routes/QRScan.tsx`

**Purpose:** Scan QR codes at programs to record attendance.

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ Scan QR Code                        │
│                                     │
│ Point your camera at the program's  │
│ QR code to check in                 │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │       📷 Camera Feed            │ │
│ │                                 │ │
│ │         ┌─────────┐             │ │
│ │         │  QR     │             │ │  ← Scanning frame
│ │         │  Frame  │             │ │
│ │         └─────────┘             │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✓ Scanning active...                │
├─────────────────────────────────────┤
│ Recent Scans                        │
│ • Art Workshop - 2 hours ago        │
│ • Basketball Training - Yesterday   │
│ • Music Jam - 3 days ago            │
└─────────────────────────────────────┘
```

**Implementation:**
- Uses `@zxing/browser` library
- Requests camera permission on mount
- Scans continuously until QR detected
- Extracts program ID from QR data
- Calls `api.xid.recordAttendance({ programId, method: 'qr' })`
- Shows success notification
- Displays recent attendance history

**QR Code Format:**
```
roomxi://program/{programId}
```

---

### 6. Me Page (`/me`)

**Route:** `/me`  
**Access:** Authenticated users only  
**File:** `src/routes/Me.tsx`

**Purpose:** Profile page with mood trends, stats, and settings.

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ Profile              [⚙️ Settings]  │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 📊 Mood Trends (Last 30 days)   │ │
│ │                                 │ │
│ │    ╱╲          ╱╲               │ │  ← Sparkline chart
│ │   ╱  ╲╱╲      ╱  ╲              │ │
│ │  ╱      ╲  ╱╲    ╲             │ │
│ │           ╲╱  ╲╱  ╲            │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔥 Current Streak               │ │
│ │ 7 days                          │ │
│ │                                 │ │
│ │ 📅 Total Check-ins              │ │
│ │ 23 check-ins                    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📍 Program Attendance           │ │
│ │ 12 programs attended            │ │
│ │                                 │ │
│ │ Recent:                         │ │
│ │ • Art Workshop - 2h ago         │ │
│ │ • Basketball - Yesterday        │ │
│ │ • Music Jam - 3 days ago        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🔄 Syncing... (if offline queue)    │
└─────────────────────────────────────┘
```

**Components:**

1. **Sparkline** (`src/ui/me/Sparkline.tsx`)
   - Mini line chart showing last 30 check-ins
   - Visual trend of mood over time
   - Built with SVG paths

2. **Stats Cards**
   - Streak count (from profile)
   - Total check-ins
   - Attendance count

3. **Offline Indicator**
   - Shows red dot when items in queue
   - Displays sync status

**Data Sources:**
- `api.checkins.list()` → Last 30 for sparkline
- `api.profile.get()` → Streak count
- `api.xid.getAttendance()` → Attendance history
- `useQueue()` hook → Offline queue count

---

### 7. Settings Page (`/settings`)

**Route:** `/settings`  
**Access:** Authenticated users only  
**File:** `src/routes/Settings.tsx`

**Visual Layout:**
```
┌─────────────────────────────────────┐
│ ← Settings                          │
├─────────────────────────────────────┤
│ Account                             │
│ • Email: user@example.com           │
│ • Change Password                   │
│                                     │
│ Ximi AI Companion                   │
│ • ✓ Ximi consent granted            │
│ • Default mode: Little Sibling      │
│                                     │
│ Privacy & Data                      │
│ • Safety Profile                    │
│ • Consent Management                │
│ • Download My Data                  │
│                                     │
│ Notifications                       │
│ • Check-in reminders: On            │
│ • Program updates: On               │
│                                     │
│ Danger Zone                         │
│ • [Delete Account]                  │
│ • [Sign Out]                        │
└─────────────────────────────────────┘
```

---

### 8. About Page (`/about`)

**Route:** `/about`  
**Access:** Public  
**File:** `src/routes/About.tsx`

**Purpose:** Institutional information for funders, partners, legal.

**Content:**
- Mission & vision statement
- Partner organizations (YMCA, OTB, etc.)
- Privacy policy
- Terms of service
- Contact information
- Acknowledgments

---

## Core Systems

### 1. The Mood System

**6-Level Weather Metaphor:**

```typescript
// src/lib/moodConfig.ts
export const MOODS = [
  {
    key: 'cold',
    label: 'Cold',
    emoji: '❄️',
    score: 1,
    desc: 'Numb, withdrawn, low energy',
    color: { h: 210, s: 40, l: 70 } // Icy blue
  },
  {
    key: 'stormy',
    label: 'Stormy',
    emoji: '⛈️',
    score: 2,
    desc: 'Overwhelmed, heavy feelings',
    color: { h: 250, s: 70, l: 40 } // Deep purple
  },
  {
    key: 'foggy',
    label: 'Foggy',
    emoji: '🌫️',
    score: 3,
    desc: 'Unclear, confused, meh',
    color: { h: 220, s: 10, l: 75 } // Gray
  },
  {
    key: 'clear',
    label: 'Clear',
    emoji: '☀️',
    score: 4,
    desc: 'Calm, stable, doing okay',
    color: { h: 48, s: 95, l: 55 } // Sunny yellow
  },
  {
    key: 'breezy',
    label: 'Breezy',
    emoji: '⚡',
    score: 5,
    desc: 'Upbeat, energized, motivated',
    color: { h: 52, s: 98, l: 58 } // Bright yellow
  },
  {
    key: 'aurora',
    label: 'Aurora',
    emoji: '🌌',
    score: 6,
    desc: 'Amazing, glowing, best mood',
    color: { h: 285, s: 70, l: 60 } // Purple-magenta
  }
];
```

**MoodOrb Component (`src/ui/home/MoodOrb.tsx`):**

The MoodOrb is the visual centerpiece of the app - an animated sphere that represents the user's emotional state.

**How it works:**

1. **Color Generation:**
```typescript
function getMoodStyle(score: number) {
  const mood = getMoodByScore(score);
  const { h, s, l } = mood.color;
  
  // Create 3-shade radial gradient
  const baseColor = `hsl(${h}, ${s}%, ${l}%)`;
  const darkerColor = `hsl(${h}, ${s}%, ${l - 20}%)`;
  const darkestColor = `hsl(${h}, ${s}%, ${l - 30}%)`;
  const lighterColor = `hsl(${h}, ${s}%, ${l + 15}%)`;
  
  return {
    gradient: `radial-gradient(circle at 30% 30%, ${baseColor}, ${darkerColor}, ${darkestColor})`,
    glow: `hsl(${h}, ${s}%, ${l}%, 0.4)`, // Box-shadow glow
    particles: lighterColor
  };
}
```

2. **Animations (Framer Motion):**
```typescript
<motion.div
  className="mood-orb"
  animate={{ scale: [1, 1.05, 1] }}  // Breathing effect
  transition={{
    duration: 8,
    repeat: Infinity,
    ease: "easeInOut"
  }}
  style={{
    background: style.gradient,
    boxShadow: `0 0 30px ${style.glow}`
  }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  onClick={onClick}
>
  {/* Highlight overlay for 3D depth */}
  <div className="absolute inset-0 rounded-full"
       style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent)' }} />
  
  {/* Floating particles */}
  {[...Array(3)].map((_, i) => (
    <motion.div
      key={i}
      className="particle"
      animate={{
        y: [0, -10, 0],
        opacity: [0.3, 0.6, 0.3]
      }}
      transition={{
        delay: i * 0.5,
        duration: 3,
        repeat: Infinity
      }}
      style={{ background: style.particles }}
    />
  ))}
</motion.div>
```

3. **Accessibility:**
- Respects `prefers-reduced-motion`
- Keyboard accessible
- ARIA labels

---

### 2. Check-In System

**3-Step Flow:**

**Step 1: Mood Selection**
```typescript
// User selects one of 6 mood tokens
<div className="grid grid-cols-3 gap-3">
  {MOODS.map(mood => (
    <button
      key={mood.key}
      onClick={() => setSelectedMood(mood.key)}
      className={selectedMood === mood.key ? 'selected' : ''}
    >
      <div className="text-4xl">{mood.emoji}</div>
      <div className="text-sm">{mood.label}</div>
    </button>
  ))}
</div>
```

**Step 2: Wellness Dimensions (SAMHSA 8)**
```typescript
// src/lib/wellnessConfig.ts
export const WELLNESS_DIMENSIONS = [
  { key: 'emotional', emoji: '💭', label: 'Emotional' },
  { key: 'physical', emoji: '💪', label: 'Physical' },
  { key: 'social', emoji: '👥', label: 'Social' },
  { key: 'spiritual', emoji: '✨', label: 'Spiritual' },
  { key: 'intellectual', emoji: '🧠', label: 'Intellectual' },
  { key: 'environmental', emoji: '🏡', label: 'Environmental' },
  { key: 'financial', emoji: '💰', label: 'Financial' },
  { key: 'purpose', emoji: '🎯', label: 'Purpose' }
];

// User selects 1-3 dimensions
const toggleDimension = (dimension) => {
  setSelectedDimensions(prev => {
    if (prev.includes(dimension)) {
      return prev.filter(d => d !== dimension);
    }
    if (prev.length >= 3) {
      return [...prev.slice(1), dimension]; // Replace oldest
    }
    return [...prev, dimension];
  });
};
```

**Step 3: Optional Note**
```typescript
// Optional text note (max 140 chars)
<textarea
  value={note}
  onChange={(e) => setNote(e.target.value)}
  placeholder="Anything you want to note? (Optional)"
  maxLength={140}
/>
```

**Submission:**
```typescript
const handleSubmit = async () => {
  const checkInData = {
    timestamp: new Date(),
    dimension: 'mood',
    moodLevel16: MOODS.find(m => m.key === selectedMood).score, // 1-6
    moodType: selectedMood, // 'cold', 'stormy', etc.
    wellnessDimensions: selectedDimensions,
    note: note.trim() || undefined,
    localTz: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
  
  // Try online submission first
  if (navigator.onLine) {
    try {
      await api.checkins.create(checkInData);
    } catch (error) {
      // Queue for later if fails
      await addToQueue('checkin', checkInData);
    }
  } else {
    // Offline - queue immediately
    await addToQueue('checkin', checkInData);
  }
};
```

**Backend Processing (`server/routes/checkins.js`):**
```javascript
router.post('/', async (req, res) => {
  const userId = req.session.userId;
  const { moodLevel16, moodType, wellnessDimensions, note, localTz } = req.body;
  
  // Scan note for crisis keywords
  let crisisFlagged = false;
  if (note) {
    const crisisKeywords = ['suicide', 'kill myself', 'hurt myself', 'hopeless'];
    crisisFlagged = crisisKeywords.some(kw => note.toLowerCase().includes(kw));
  }
  
  // Insert check-in
  const [checkIn] = await db.insert(checkins).values({
    userId,
    timestamp: new Date(),
    checkinDate: new Date().toISOString().split('T')[0],
    moodLevel16,
    moodType,
    wellnessDimensions,
    note,
    localTz,
    crisisFlagged
  }).returning();
  
  // Update streak
  await updateStreak(userId, new Date());
  
  return res.json({ data: checkIn });
});
```

---

### 3. Streak System (DST-Safe)

**File:** `server/services/streak.ts`

**Problem:** Date comparisons fail during daylight saving time transitions.

**Solution:** Use Luxon for timezone-aware date handling.

```typescript
import { DateTime } from 'luxon';

export async function updateStreak(userId: string, checkInTimestamp: Date) {
  // Get user's profile
  const [profile] = await db.select()
    .from(profiles)
    .where(eq(profiles.userId, userId));
  
  if (!profile) return;
  
  const timezone = profile.timezone || 'America/Edmonton';
  
  // Convert check-in to user's local date
  const today = DateTime.fromJSDate(checkInTimestamp)
    .setZone(timezone)
    .startOf('day');
  
  // Get last check-in date
  const lastCheckinDate = profile.lastCheckinDate
    ? DateTime.fromISO(profile.lastCheckinDate).setZone(timezone).startOf('day')
    : null;
  
  let newStreak = profile.streakCount || 0;
  
  if (!lastCheckinDate) {
    // First check-in ever
    newStreak = 1;
  } else {
    const daysDiff = today.diff(lastCheckinDate, 'days').days;
    
    if (daysDiff === 0) {
      // Same day - no change
      return;
    } else if (daysDiff === 1) {
      // Consecutive day - increment
      newStreak += 1;
    } else {
      // Missed a day - reset
      newStreak = 1;
    }
  }
  
  // Update profile
  await db.update(profiles)
    .set({
      streakCount: newStreak,
      lastCheckinDate: today.toISODate()
    })
    .where(eq(profiles.userId, userId));
}
```

**Why Luxon?**
- Handles DST transitions correctly
- Works with user's local timezone
- Accurate day comparisons across time changes

---

### 4. Ximi AI Companion

**Dual Personality System:**

**1. Little Sibling Mode (Floating Dock)**
- **Where:** Home & Explore pages
- **Tone:** Warm, curious, supportive
- **Use cases:** Quick questions, program discovery, mood reminders

**2. Peer Guide Mode (Journal)**
- **Where:** Journal page
- **Tone:** Mature, reflective, mentor-like
- **Use cases:** Guided journaling, deeper reflection

**Implementation (`server/services/ximi.ts`):**

```typescript
const SYSTEM_PROMPTS = {
  sibling: `You are Ximi, a warm and supportive AI companion for youth aged 13-25.
    
    PERSONALITY:
    - Tone: Casual, curious, encouraging (like a caring younger sibling)
    - Energy: Upbeat but not overwhelming
    - Approach: Ask simple questions, celebrate small wins
    
    GUIDELINES:
    - Keep responses concise (2-3 sentences max)
    - Use youth-friendly language (no jargon)
    - Suggest programs when relevant
    - Never preachy or condescending
    
    EXAMPLE RESPONSES:
    - "That sounds tough! Have you tried any of the creative programs on the Explore tab? Sometimes art helps me sort out my feelings."
    - "Nice job checking in today! 🎉 Your streak is looking good. How are you feeling?"
    - "I'm here if you want to talk about it. Want me to share some support resources?"`,
  
  peer: `You are Ximi in Peer Guide mode - a grounded peer or mentor for youth.
    
    PERSONALITY:
    - Tone: Respectful, thoughtful, equal (not parental)
    - Energy: Calm, focused, present
    - Approach: Ask reflective questions, encourage deeper thinking
    
    GUIDELINES:
    - Focus on growth, leadership, actionable steps
    - Use "we" language (collaborative, not directive)
    - Validate feelings without fixing
    - Keep responses meaningful but not preachy
    
    EXAMPLE RESPONSES:
    - "That's a tough spot to be in. What part of that situation do you have control over?"
    - "It sounds like you're carrying a lot right now. What would it look like to give yourself some grace?"
    - "I hear you. When you imagine yourself six months from now, having worked through this, what do you think helped you get there?"`
};

export async function chat(userId: string, message: string, mode: 'sibling' | 'peer') {
  // Get conversation history
  const history = await getConversationHistory(userId, mode);
  
  // Detect crisis keywords
  const crisisDetected = detectCrisis(message);
  
  if (crisisDetected) {
    const response = {
      ximiResponse: "I'm concerned about what you've shared. Let me connect you with immediate support resources that can help.",
      crisisDetected: true
    };
    
    // Save conversation
    await saveConversation(userId, message, response.ximiResponse, mode, true);
    
    return response;
  }
  
  // Call OpenAI-compatible API (configured in server/services/ximi.ts)
  // Uses OpenAI SDK with AI_INTEGRATIONS_OPENAI_API_KEY and AI_INTEGRATIONS_OPENAI_BASE_URL
  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS[mode] },
      ...history,
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: 150
  });
  
  const ximiResponse = aiResponse.choices[0].message.content;
  
  // Save conversation
  await saveConversation(userId, message, ximiResponse, mode, false);
  
  return { ximiResponse, crisisDetected: false };
}
```

**Crisis Detection:**
```typescript
const CRISIS_KEYWORDS = [
  // Direct crisis terms
  'suicide', 'kill myself', 'end my life', 'want to die', 'better off dead',
  'hurt myself', 'self harm', 'cut myself', 'overdose', 'end it all',
  
  // Severe distress indicators
  'can\'t go on', 'no point', 'hopeless', 'worthless', 'nobody cares',
  'give up', 'can\'t take it', 'too much pain', 'nothing matters',
  
  // Emergency situations
  'emergency', 'crisis', 'help me', 'scared', 'danger', 'unsafe'
];

function detectCrisis(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return CRISIS_KEYWORDS.some(keyword => normalized.includes(keyword));
}
```

**Frontend Integration:**

**XimiDock (Little Sibling):**
```typescript
// src/ui/explore/XimiDock.tsx
export default function XimiDock({ onCrisis }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const sendMessage = async () => {
    const userMsg = { text: input, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    const { data } = await api.ximi.chat({ message: input });
    
    if (data.crisisDetected) {
      onCrisis(); // Trigger crisis sheet
    }
    
    const ximiMsg = {
      text: data.ximiResponse,
      isUser: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, ximiMsg]);
  };
  
  return (
    <>
      {/* Floating button */}
      <button onClick={() => setIsOpen(true)}>🤖</button>
      
      {/* Chat overlay */}
      {isOpen && (
        <div className="chat-overlay">
          {messages.map(msg => (
            <div className={msg.isUser ? 'user-message' : 'ximi-message'}>
              {msg.text}
            </div>
          ))}
          <input value={input} onChange={e => setInput(e.target.value)} />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </>
  );
}
```

---

### 5. Authentication System

**Session-Based (No JWT):**

**Why sessions over JWT?**
- Simpler revocation (just delete session)
- No token expiry management
- Stored in PostgreSQL (persistent)
- httpOnly cookies (XSS protection)

**Registration Flow:**

```javascript
// server/routes/auth.js
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Check if exists
  const existing = await db.select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  // Hash password (bcrypt, 10 rounds)
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create user
  const [newUser] = await db.insert(users).values({
    email,
    passwordHash
  }).returning();
  
  // Create profile
  await db.insert(profiles).values({
    userId: newUser.id,
    firstName,
    lastName
  });
  
  // Set session
  req.session.userId = newUser.id;
  req.session.email = newUser.email;
  
  res.status(201).json({
    user: { id: newUser.id, email: newUser.email }
  });
});
```

**Login Flow:**

```javascript
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  // Set session
  req.session.userId = user.id;
  req.session.email = user.email;
  
  res.json({
    user: { id: user.id, email: user.email }
  });
});
```

**Session Middleware (`server/index.js`):**

```javascript
import session from 'express-session';
import PgStore from 'connect-pg-simple';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(session({
  store: new PgStore({
    pool,
    createTableIfMissing: true // Auto-creates session table
  }),
  secret: process.env.SESSION_SECRET || 'change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true, // No JavaScript access
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' // CSRF protection
  }
}));
```

**Frontend Session Hook (`src/lib/session.tsx`):**

```typescript
export function useSession() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSession();
  }, []);
  
  async function loadSession() {
    try {
      const { data } = await api.auth.me();
      setUser(data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  
  return { user, loading };
}
```

---

### 6. Offline Support System

**IndexedDB Queue (`src/lib/queue.ts`):**

```typescript
import { openDB } from 'idb';

const DB_NAME = 'roomxi-offline';
const STORE_NAME = 'queue';

// Open IndexedDB
async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

// Add to queue
export async function addToQueue(type: string, data: any) {
  const db = await getDB();
  await db.add(STORE_NAME, {
    type,
    data,
    timestamp: Date.now()
  });
}

// Get all queued items
export async function getQueueItems() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

// Remove from queue
export async function removeFromQueue(id: number) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

// React hook for queue status
export function useQueue() {
  const [itemCount, setItemCount] = useState(0);
  
  useEffect(() => {
    async function checkQueue() {
      const items = await getQueueItems();
      setItemCount(items.length);
    }
    
    checkQueue();
    const interval = setInterval(checkQueue, 5000); // Check every 5s
    
    return () => clearInterval(interval);
  }, []);
  
  return { itemCount };
}
```

**Background Sync Worker:**

```typescript
// Service worker (auto-generated by vite-plugin-pwa)
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncQueuedData());
  }
});

async function syncQueuedData() {
  const items = await getQueueItems();
  
  for (const item of items) {
    try {
      if (item.type === 'checkin') {
        await fetch('/api/checkins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });
        
        await removeFromQueue(item.id);
      }
    } catch (error) {
      // Keep in queue, retry later
      console.error('Sync failed:', error);
    }
  }
}
```

**Visual Feedback:**

```typescript
// In Me page
const { itemCount } = useQueue();

return (
  <div>
    {itemCount > 0 && (
      <div className="sync-banner">
        🔄 Syncing {itemCount} item{itemCount > 1 ? 's' : ''}...
      </div>
    )}
  </div>
);

// In bottom nav Tab component
<Tab to="/me" icon={<User />} label="Me" showDot={itemCount > 0} />
```

---

## Database Schema

**File:** `server/schema.ts`

### Tables

**1. users**
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
```

**2. profiles**
```typescript
export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  
  // Basic info
  firstName: text("first_name"),
  lastName: text("last_name"),
  preferredName: text("preferred_name"),
  age: integer("age"),
  dateOfBirth: date("date_of_birth"),
  city: text("city"),
  timezone: text("timezone").default("America/Edmonton"),
  
  // Streak tracking
  streakCount: integer("streak_count").default(0),
  lastCheckinDate: date("last_checkin_date"),
  
  // Ximi preferences
  ximiConsent: boolean("ximi_consent").default(false),
  ximiMode: text("ximi_mode").default("sibling"), // 'sibling' | 'peer'
  
  // Admin
  isAdmin: boolean("is_admin").notNull().default(false),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
```

**3. checkins**
```typescript
export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  checkinDate: date("checkin_date").notNull(), // For unique constraint
  
  dimension: text("dimension").notNull(), // 'mood'
  moodLevel16: integer("mood_level_1_6").notNull(), // 1-6 score
  moodType: text("mood_type"), // 'cold', 'stormy', etc.
  
  // Wellness data
  wellnessDimensions: text("wellness_dimensions").array().default(sql`'{}'`),
  affectTags: text("affect_tags").array().notNull().default(sql`'{}'`),
  note: text("note"),
  localTz: text("local_tz"),
  
  // Crisis detection
  crisisFlagged: boolean("crisis_flagged").default(false),
  crisisResolvedAt: timestamp("crisis_resolved_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  // Unique constraint: one check-in per user per day
  oneDayIdx: uniqueIndex("checkins_one_per_day_idx").on(table.userId, table.checkinDate),
  userTsIdx: index("checkins_user_ts_idx").on(table.userId, table.timestamp.desc()),
  crisisIdx: index("checkins_crisis_idx").on(table.crisisFlagged, table.timestamp.desc())
}));
```

**4. programs**
```typescript
export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  title: text("title").notNull(),
  description: text("description"),
  organizer: text("organizer"),
  
  // Location
  locationName: text("location_name"),
  address: text("address"),
  city: text("city").default("Edmonton"),
  lat: numeric("lat"),
  lng: numeric("lng"),
  
  // Classification
  tags: text("tags").array().default(sql`'{}'`),
  free: boolean("free").default(false),
  indoor: boolean("indoor").default(false),
  outdoor: boolean("outdoor").default(false),
  
  // Contact
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  
  // Meta
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
```

**5. saved_programs**
```typescript
export const savedPrograms = pgTable("saved_programs", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  pk: primaryKey(table.userId, table.programId)
}));
```

**6. ximi_conversations**
```typescript
export const ximiConversations = pgTable("ximi_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  userMessage: text("user_message").notNull(),
  ximiResponse: text("ximi_response").notNull(),
  mode: text("mode").notNull(), // 'sibling' | 'peer'
  
  crisisDetected: boolean("crisis_detected").default(false),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: index("ximi_conversations_user_idx").on(table.userId, table.createdAt.desc())
}));
```

**7. attendance**
```typescript
export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
  
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  method: text("method").notNull(), // 'qr' | 'manual'
  site: text("site"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdx: index("attendance_user_idx").on(table.userId, table.timestamp.desc())
}));
```

---

## API Documentation

**Base URL:** `/api`

### Authentication Endpoints

**POST /api/auth/register**
- **Body:** `{ email, password, firstName?, lastName? }`
- **Response:** `{ user: { id, email } }`
- **Sets:** Session cookie

**POST /api/auth/login**
- **Body:** `{ email, password }`
- **Response:** `{ user: { id, email } }`
- **Sets:** Session cookie

**POST /api/auth/logout**
- **Response:** `{ message: 'Logged out' }`
- **Clears:** Session cookie

**GET /api/auth/me**
- **Response:** `{ user: { id, email, profile } }`
- **Auth:** Required

---

### Check-In Endpoints

**POST /api/checkins**
- **Body:**
  ```json
  {
    "timestamp": "2025-10-30T12:00:00Z",
    "dimension": "mood",
    "moodLevel16": 4,
    "moodType": "clear",
    "wellnessDimensions": ["emotional", "social"],
    "note": "Feeling good today",
    "localTz": "America/Edmonton"
  }
  ```
- **Response:** `{ data: CheckIn }`
- **Auth:** Required

**GET /api/checkins**
- **Response:** `{ data: CheckIn[] }` (sorted by timestamp desc)
- **Auth:** Required

---

### Program Endpoints

**GET /api/programs**
- **Response:** `{ data: Program[] }`
- **Auth:** Optional (public)

**GET /api/programs/:id**
- **Response:** `{ data: Program }`
- **Auth:** Optional (public)

**GET /api/programs/saved**
- **Response:** `{ data: Program[] }`
- **Auth:** Required

**POST /api/programs/saved**
- **Body:** `{ programId }`
- **Response:** `{ message: 'Saved' }`
- **Auth:** Required

**DELETE /api/programs/saved/:programId**
- **Response:** `{ message: 'Removed' }`
- **Auth:** Required

---

### Ximi AI Endpoints

**POST /api/ximi/chat**
- **Body:** `{ message: string }`
- **Response:**
  ```json
  {
    "data": {
      "id": "uuid",
      "ximiResponse": "AI response text",
      "crisisDetected": false,
      "createdAt": "2025-10-30T12:00:00Z"
    }
  }
  ```
- **Auth:** Required

**POST /api/ximi/toggle-mode**
- **Body:** `{ mode: 'sibling' | 'peer' }`
- **Response:** `{ message: 'Mode updated' }`
- **Auth:** Required

**GET /api/ximi/conversations**
- **Response:** `{ data: Conversation[] }`
- **Auth:** Required

---

### QR/Attendance Endpoints

**POST /api/xid/attendance**
- **Body:** `{ programId, method: 'qr' | 'manual' }`
- **Response:** `{ data: AttendanceRecord }`
- **Auth:** Required

**GET /api/xid/attendance**
- **Response:** `{ data: AttendanceRecord[] }`
- **Auth:** Required

---

### Profile Endpoints

**GET /api/profile**
- **Response:**
  ```json
  {
    "data": {
      "userId": "uuid",
      "firstName": "John",
      "streakCount": 7,
      "lastCheckinDate": "2025-10-30",
      "ximiConsent": true,
      "ximiMode": "sibling"
    }
  }
  ```
- **Auth:** Required

**PUT /api/profile**
- **Body:** `{ firstName?, lastName?, ximiConsent?, ... }`
- **Response:** `{ data: Profile }`
- **Auth:** Required

---

## Component Library

### Key Reusable Components

**1. MoodOrb** (`src/ui/home/MoodOrb.tsx`)
```typescript
interface MoodOrbProps {
  size?: number;
  mood?: number; // 1-6
  onClick?: () => void;
  className?: string;
}
```

**2. CheckInForm** (`src/ui/home/CheckInForm.tsx`)
```typescript
interface CheckInFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

**3. ProgramCard** (`src/ui/explore/ProgramCard.tsx`)
```typescript
interface ProgramCardProps {
  program: Program;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
}
```

**4. XimiDock** (`src/ui/explore/XimiDock.tsx`)
```typescript
interface XimiDockProps {
  onCrisis: () => void;
}
```

**5. CrisisSheet** (`src/ui/crisis/CrisisSheet.tsx`)
```typescript
interface CrisisSheetProps {
  open: boolean;
  onClose: () => void;
}
```

---

## Deployment Guide

### Deploying to Replit

**1. Environment Variables**

Set in Replit Secrets:
```
DATABASE_URL=postgresql://...
SESSION_SECRET=random-secret-key
AI_INTEGRATIONS_OPENAI_API_KEY=your-api-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
NODE_ENV=production
```

**2. Build Configuration**

Already configured in `package.json`:
```json
{
  "scripts": {
    "dev": "tsx server/index.js",
    "build": "vite build",
    "start": "NODE_ENV=production tsx server/index.js"
  }
}
```

**3. Replit Run Configuration**

`.replit` file (auto-configured):
```toml
run = "npm run dev"
entrypoint = "server/index.js"

[deployment]
run = ["npm", "run", "start"]
```

**4. Deploy**

1. Click "Deploy" in Replit
2. Choose "Autoscale" deployment
3. Set run command: `npm run start`
4. Domain will be: `<repl-name>.<username>.repl.co`

---

### Custom Domain Setup

1. In Replit deployment settings, add custom domain
2. Point your domain's CNAME to Replit's provided address
3. Wait for SSL cert provisioning (automatic)

---

## Known Issues & Future Work

### Current Limitations

1. **Journal Persistence**
   - Journal save/finish buttons are stubbed
   - Need to implement `/api/journal` endpoints
   - Schema: `journal_entries` table

2. **Program Search**
   - No text search yet (only filter by tags)
   - Should add full-text search

3. **Ximi Conversation History**
   - Conversations stored but not displayed in UI
   - Add conversation history view in Journal

4. **Crisis Escalation**
   - Crisis detection works, but no staff notification system
   - Need admin dashboard for crisis alerts

5. **PWA Install Prompt**
   - Service worker configured but install prompt not implemented
   - Add beforeinstallprompt event handler

### Future Features

**Phase 1 (Next Sprint):**
- [x] **COMPLETED:** Guardian consent system for under-18 (PIPA/FOIP compliant)
- [ ] **URGENT:** Implement email/SMS delivery for guardian verification links
- [ ] Implement journal persistence API
- [ ] Add conversation history view
- [ ] Program text search
- [ ] PWA install prompt

**Phase 2:**
- [ ] Partner consent and RLS policies (scoped data access for organizations)
- [ ] Admin consent status dashboard and audit exports
- [ ] 30-day auto-deletion for non-synced emotional data
- [ ] Admin dashboard for crisis monitoring
- [ ] Staff view of youth check-ins (with consent)
- [ ] Program recommendation engine
- [ ] Push notifications for check-in reminders

**Phase 3:**
- [ ] Group programs/events
- [ ] Peer connections (find friends at programs)
- [ ] Achievements & XP system
- [ ] Text-to-speech for consent cards (accessibility)

---

## Getting Help

### Resources

- **Replit Docs:** https://docs.replit.com
- **React Docs:** https://react.dev
- **Drizzle ORM:** https://orm.drizzle.team
- **Leaflet Docs:** https://leafletjs.com
- **Framer Motion:** https://www.framer.com/motion

### Support

- **Technical Issues:** Create GitHub issue
- **Feature Requests:** Submit via project board
- **Security Issues:** Email security@roomxi.org

---

**Last Updated:** November 22, 2025  
**Version:** 1.2  
**Maintainer:** Room XI Development Team
