# Room XI Connect

A youth mental health and wellness platform for ages 13-25, providing daily check-ins, local program discovery, and crisis support resources. Room XI Connect helps young people feel seen, build capacity, and find community.

## 🌟 Features

### For Youth (Ages 13-25)
- **Daily Check-ins**: Track your mood and emotions with the cosmic "Mood Orb"
- **Program Discovery**: Browse free and low-cost programs in Edmonton (no login required)
- **Crisis Support**: Quick access to mental health resources and helplines  
- **Personal Dashboard**: View your check-in history, streaks, and program attendance
- **Save Programs**: Bookmark programs you're interested in
- **QR Code Check-in**: Easy attendance tracking at in-person programs
- **Offline Support**: Core features work offline with automatic sync

### Privacy & Compliance
- **PIPA & HIA Compliant**: Alberta privacy legislation compliance for youth data
- **Granular Consent**: Separate consent for health data, photos, and program participation
- **Data Sovereignty**: Optional Indigenous self-identification with OCAP principles
- **Breach Notification**: 72-hour OIPC notification system (Alberta requirement)
- **Non-Identifying XID**: Privacy-first identifiers for program attendance

### Design & Experience
- **Cosmic Garden Design System**: Calm, tranquil aesthetic with cosmic elements
- **Trauma-Informed UX**: Safe, non-judgmental interface design
- **Progressive Web App**: Install on any device, works like a native app
- **Accessibility First**: WCAG 2.1 AA compliant

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (installed via Replit)
- PostgreSQL database (Replit Neon instance)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd room-xi-connect
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file or use Replit Secrets:
```env
# Database (auto-configured on Replit)
DATABASE_URL=postgresql://...

# Session secret (auto-generated if not set)
SESSION_SECRET=your-secret-key-here

# Optional: Custom map tiles
VITE_MAP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=&copy; OpenStreetMap contributors

# Feature flags (optional)
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE=true
```

4. **Initialize the database**
```bash
npm run db:push
```

5. **Seed the database** (optional, adds sample programs)
```bash
npm run db:seed
```

6. **Start the development server**
```bash
npm run dev
```

The app will be available at http://localhost:5000

### Test Account
For development/testing:
- Email: `test@example.com`
- Password: `test123`

## 📦 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite 5** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Leaflet** - Interactive maps
- **Recharts** - Data visualization

### Backend
- **Express.js** - HTTP server
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** (Neon) - Database
- **Express Session** - Session-based authentication
- **bcrypt** - Password hashing
- **connect-pg-simple** - PostgreSQL session store

### PWA & Offline
- **vite-plugin-pwa** - Progressive Web App support
- **IndexedDB** (idb) - Client-side storage
- **Service Worker** - Offline caching

## 🏗️ Project Structure

```
room-xi-connect/
├── server/                 # Backend Express server
│   ├── index.js           # Main server entry point
│   ├── schema.ts          # Drizzle database schema
│   ├── seed.ts            # Database seeding script
│   └── routes/            # API route handlers
│       ├── auth.js        # Authentication endpoints
│       ├── profile.js     # User profile management
│       ├── checkins.js    # Daily check-in endpoints
│       ├── programs.js    # Program discovery
│       ├── xid.js         # Privacy-preserving IDs
│       └── crisis.js      # Crisis resources
├── src/                   # Frontend React app
│   ├── lib/               # Utilities and helpers
│   │   ├── api.ts         # API client
│   │   ├── session.tsx    # Session management
│   │   └── queue.ts       # Offline sync queue
│   ├── routes/            # Page components
│   │   ├── Home.tsx       # Dashboard with check-ins
│   │   ├── Me.tsx         # User profile
│   │   ├── Settings.tsx   # User settings
│   │   ├── Explore.tsx    # Program browser
│   │   ├── Journal.tsx    # Check-in history
│   │   └── auth/          # Auth pages
│   ├── ui/                # Reusable UI components
│   │   ├── home/          # Home page components
│   │   ├── explore/       # Program discovery UI
│   │   ├── crisis/        # Crisis support sheet
│   │   └── me/            # Profile components
│   └── shell/             # App shell (nav, layout)
├── public/                # Static assets
├── package.json           # Dependencies
└── vite.config.ts         # Vite configuration
```

## 🔐 Authentication & Security

### Session-Based Authentication
Room XI Connect uses secure session-based authentication:

- Sessions stored in PostgreSQL with `connect-pg-simple`
- httpOnly cookies prevent XSS attacks
- SameSite cookies for CSRF protection
- Secure cookies in production (HTTPS only)
- 7-day session expiration with sliding window

### Password Security
- bcrypt hashing with salt rounds = 10
- Minimum 6-character password requirement
- Account deletion with password confirmation

### Privacy Features
- Non-identifying XIDs for program attendance
- Granular consent management (5 separate photo/media consents)
- Health data separated with HIA-compliant consent tracking
- Audit trails for all consent changes
- Breach notification system

## 📱 API Endpoints

### Authentication
```
POST   /api/auth/register       - Create new account
POST   /api/auth/login          - Sign in
POST   /api/auth/logout         - Sign out
POST   /api/auth/reset-password - Request password reset
POST   /api/auth/update-password- Update password
DELETE /api/auth/delete-account - Delete account
GET    /api/auth/session        - Check session status
```

### Profile
```
GET    /api/profile             - Get user profile
PUT    /api/profile             - Update profile
```

### Check-ins
```
POST   /api/checkins            - Create check-in
GET    /api/checkins            - List user's check-ins
```

### Programs
```
GET    /api/programs            - List all programs
GET    /api/programs/:id        - Get program details
GET    /api/programs/saved      - List saved programs
POST   /api/programs/saved      - Save a program
DELETE /api/programs/saved/:id  - Unsave a program
```

### XID (Privacy IDs)
```
GET    /api/xid                 - Get user's XID
GET    /api/xid/attendance      - Get attendance history
```

### Crisis Support
```
GET    /api/crisis              - Get crisis resources
```

## 🗄️ Database Schema

### Core Tables
- **users** - Authentication and credentials
- **profiles** - User profile data, streaks, XP
- **consents** - Granular consent tracking
- **consent_events** - Audit trail for consent changes
- **health_profiles** - HIA-compliant health data storage
- **guardian_verifications** - Guardian approval tracking

### Program Tables
- **programs** - Program/activity catalog
- **saved_programs** - User bookmarks
- **attendance** - QR check-in records

### Check-in Tables
- **checkins** - Daily mood tracking
- **journal_entries** - Extended journal entries

### Compliance Tables
- **breach_events** - Privacy breach tracking
- **session** - Express session storage

See `server/schema.ts` for complete schema definitions.

## 🎨 Design System - "Cosmic Garden"

### Color Palette
- **Cream** (#F8F6F0) - Primary background
- **Deep Sage** (#2D3748) - Primary text
- **Teal** (#2EC489) - Primary accent
- **Gold** (#D4AF37) - Brand accent
- **Sage** (#9CAF88) - Secondary
- **Coral** (#FF6B6B) - Alerts/warnings
- **Navy** (#1A365D) - Dark elements

### Typography
- **Display**: Playfair Display (headings)
- **Body**: Inter (body text)
- **Monospace**: System monospace (code)

### Key Components

#### Mood Orb
The central feature - a breathing, interactive orb that visualizes mood state:
- Color-coded mood representation
- Accessibility patterns for color-blind users
- Trauma-informed design (no red/alarm colors)
- Smooth animations with reduced-motion support

#### Offline Queue System
Robust offline functionality with encrypted local storage:
- Automatic sync when connection restored
- Visual indicators for pending sync
- Encrypted sensitive data storage
- Retry logic with exponential backoff

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui
```

## 🚢 Deployment

### Replit Deployment (Autoscale)

1. **Configure deployment**
```bash
# Already configured in .replit
deployment_target = "autoscale"
```

2. **Build the app**
```bash
npm run build
```

3. **Deploy**
Click the "Deploy" button in Replit or use the CLI

### Environment Variables for Production
Ensure these are set in Replit Secrets:
- `DATABASE_URL` - Production database connection
- `SESSION_SECRET` - Secret key for session encryption
- All `VITE_*` variables for runtime configuration

### Database Migrations
When schema changes:
```bash
# Push schema changes to database
npm run db:push

# Force push if there are conflicts
npm run db:push --force
```

## 📊 Database Seeding

The seed script (`npm run db:seed`) creates:
- 1 test user (test@example.com / test123)
- 10 sample programs across Edmonton
- Crisis support resources (phone, chat, text lines)

## 🌐 Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key (auto-generated if not set)

### Optional
- `VITE_MAP_TILES_URL` - Custom map tile server
- `VITE_MAP_ATTRIBUTION` - Map attribution text
- `VITE_ENABLE_PWA` - Enable PWA features (default: true)
- `VITE_ENABLE_OFFLINE` - Enable offline mode (default: true)

## 🤝 Contributing

### Development Workflow
1. Create a feature branch
2. Make your changes
3. Test thoroughly (auth, programs, check-ins)
4. Submit a pull request

### Code Standards
- TypeScript for type safety
- Tailwind CSS for styling
- camelCase for API responses
- snake_case for database columns

### Trauma-Informed Development
- **Safety First**: All features reviewed for emotional safety
- **Inclusive Design**: Accessible to users with diverse needs
- **Crisis Protocols**: Robust crisis detection and response
- **User Agency**: Users maintain control over their experience

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Complete component and data flow documentation
- **[replit.md](./replit.md)**: Project summary and preferences

## 🆘 Crisis Support

Room XI Connect includes comprehensive crisis support features:

### Immediate Support
- **Crisis Hotlines**: Direct links to crisis support services
- **Text Support**: SMS-based crisis support options
- **Local Resources**: Location-based support services
- **Emergency Contacts**: Quick access to emergency services

## 📄 License

Copyright © 2025 Room 11 Foundation. All rights reserved.

## 🙏 Acknowledgments

**Partners & Supporters:**
- CanManDan
- JumpStart
- Allendale Community League
- Duggan Community League
- YMCA of Northern Alberta
- OTB Basketball

**Technology:**
- OpenStreetMap for map tiles
- Replit for hosting infrastructure
- Neon for PostgreSQL database

## 📞 Support

### For Youth
- Crisis support available 24/7 within the app
- Email: support@room11foundation.org

### For Developers
- Documentation: See `ARCHITECTURE.md` for detailed component/data flow docs
- Issues: Submit via GitHub issues
- Contact: tech@room11foundation.org

---

Built with ❤️ for youth mental health and wellness
