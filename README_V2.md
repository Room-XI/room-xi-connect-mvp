# Room XI Connect v2.0 - Edmonton Multi-Org Expansion

> Empowering youth through technology, community, and compassionate support

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](CHANGELOG.md)
[![Security](https://img.shields.io/badge/security-PHIPA%20%7C%20GDPR-orange.svg)](SECURITY.md)

## 🌟 Overview

Room XI Connect is a **trauma-informed mental health platform** that connects youth (ages 13-25), community organizations, and guardians in a secure, consent-based ecosystem. Built with healthcare-grade security and privacy-first principles.

### Key Features

**For Youth:**
- 🌈 **Mood Orb** - Visual mood tracking with the cosmic "Mood Orb"
- ✍️ **Living Journal** - Private journaling with AI companion (Ximi)
- 🧘 **Coping Skills** - 30+ evidence-based wellness techniques
- 🗺️ **Program Discovery** - Find programs and events on an interactive map
- 🆘 **Crisis Support** - Immediate access to crisis resources
- 📱 **Offline-First** - Works without internet, syncs when connected

**For Organizations:**
- 📊 **Dashboard** - Real-time insights into youth well-being
- 🤝 **Warm Referrals** - Consent-based referrals between organizations
- 📝 **Case Notes** - Encrypted notes (PHIPA compliant)
- 📅 **Program Management** - Create and manage programs
- 📈 **Analytics** - Track outcomes and generate reports

**For Guardians:**
- ✅ **Consent Management** - Digital consent for data sharing
- 📄 **Document Signing** - Secure document workflows
- 🔒 **Privacy Controls** - Manage youth data permissions
- 📬 **Updates** - Receive youth updates (with consent)

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + Framer Motion
- React Router v6
- Vite (build tool)
- PWA (offline-first)

**Backend:**
- Supabase (PostgreSQL + Auth + Edge Functions)
- Row Level Security (RLS)
- AES-256-GCM encryption

**External Services:**
- SendGrid (email)
- Upstash Redis (rate limiting)
- Sentry (error tracking)
- Vercel (hosting)

### Security Features

- ✅ Healthcare-grade encryption (AES-256-GCM)
- ✅ Row Level Security (RLS)
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Input validation (Zod)
- ✅ Audit logging
- ✅ PHIPA/GDPR/PIPA compliant

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- SendGrid account (for emails)
- Upstash account (for rate limiting)

### Installation

```bash
# Clone the repository
git clone https://github.com/Room-XI/room-xi-connect-mvp.git
cd room-xi-connect-mvp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy referral-create
supabase functions deploy send-consent-email
supabase functions deploy verify-consent
supabase functions deploy xid-create

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SendGrid
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM=consent@roomxiconnect.org

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# App URL
APP_URL=https://roomxiconnect.org

# Sentry (optional)
VITE_SENTRY_DSN=https://your-key@sentry.io/project-id
```

### Generate Encryption Keys

```bash
# Case notes encryption key (256-bit)
openssl rand -base64 32

# XID pepper (512-bit)
openssl rand -hex 64

# Store in Supabase Vault
supabase secrets set app.case_notes_encryption_key="YOUR_KEY"
supabase secrets set app.xid_pepper="YOUR_PEPPER"
```

## 📖 Documentation

- **[UPGRADE_GUIDE.md](UPGRADE_GUIDE.md)** - Migration from v1.0 to v2.0
- **[FINAL_APP_SPEC.md](FINAL_APP_SPEC.md)** - Complete technical specification
- **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** - 12-week launch timeline
- **[PLACEHOLDERS_CHECKLIST.md](PLACEHOLDERS_CHECKLIST.md)** - Action items before launch
- **[red_flags_report.md](red_flags_report.md)** - Security analysis and fixes

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run security tests
npm run test:security

# Check code coverage
npm run test:coverage
```

## 🏃 Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

## 📦 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### Manual Deployment

```bash
# Build
npm run build

# Deploy dist/ folder to your hosting provider
```

## 🔒 Security

### Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

Email: security@roomxi.org

### Security Features

- **Encryption**: AES-256-GCM for case notes
- **Authentication**: Supabase Auth with JWT
- **Authorization**: Row Level Security (RLS)
- **Input Validation**: Zod schemas
- **CSRF Protection**: Token-based
- **Rate Limiting**: Upstash Redis
- **Audit Logging**: All data access logged

### Compliance

- ✅ **PIPA** (Alberta)
- ✅ **PHIPA** (Ontario)
- ✅ **GDPR** (EU)
- ✅ **FOIP** (Alberta)

## 🤝 Contributing

We welcome contributions from the community!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📊 Database Schema

### Core Tables

- `youth_profiles` - Youth user profiles
- `organizations` - Partner organizations
- `org_members` - Organization membership
- `programs` - Programs and events
- `attendance` - Program attendance tracking
- `consents` - Consent management
- `referrals` - Warm referrals between orgs
- `case_notes` - Encrypted case notes
- `journal_entries` - Living Journal entries
- `coping_skills` - Coping skills library
- `crisis_supports` - Crisis resources
- `xids` - Anonymous identifiers
- `audit_trail` - Comprehensive audit log

See [FINAL_APP_SPEC.md](FINAL_APP_SPEC.md) for complete schema.

## 🎨 Design System

### Colors

- **Cosmic Teal**: `#2EC489` (Primary)
- **Cosmic Purple**: `#8B5CF6` (Secondary)
- **Cosmic Amber**: `#F59E0B` (Accent)
- **Cosmic Rose**: `#EC4899` (Highlight)
- **Cosmic Midnight**: `#1E293B` (Text)

### Typography

- **Headings**: Inter (Bold)
- **Body**: Inter (Regular)
- **Journal**: Merriweather (Serif)

### Components

- **Mood Orb**: Animated gradient orb
- **Cards**: Rounded corners, soft shadows
- **Buttons**: Rounded, hover states
- **Forms**: Inline validation, clear errors

## 📱 Mobile Support

Room XI Connect is a **Progressive Web App (PWA)** that works on:

- ✅ iOS (Safari)
- ✅ Android (Chrome)
- ✅ Desktop (All modern browsers)

### Offline Support

Core features work offline:
- Mood check-ins
- Journal entries
- Crisis support contacts
- Saved programs

Data syncs automatically when connection is restored.

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📈 Performance

- **Lighthouse Score**: 90+ (all categories)
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3.5s
- **Bundle Size**: <500KB (gzipped)

## 🐛 Known Issues

See [Issues](https://github.com/Room-XI/room-xi-connect-mvp/issues) for current bugs and feature requests.

## 📅 Roadmap

### Phase 1 (Complete) ✅
- Youth mood tracking
- Program discovery
- QR attendance
- Crisis support

### Phase 2 (Current) 🚧
- Multi-org system
- Warm referrals
- Guardian portal
- Living Journal
- Coping skills

### Phase 3 (Planned) 📋
- 211 Alberta integration
- Alberta Digital ID
- SchoolZone SSO
- Video chat
- AI-powered Ximi

## 👥 Team

- **Founder**: Room XI
- **Tech Lead**: [Your Name]
- **Design**: [Designer Name]
- **Clinical Advisor**: [Advisor Name]
- **Youth Advisory Group**: 8 youth advisors

## 📄 License

Proprietary - Room XI © 2025

## 🙏 Acknowledgments

- Edmonton youth who inspired this platform
- Partner organizations providing feedback
- Indigenous community advisors
- Mental health professionals
- Open source community

## 📞 Contact

- **Website**: https://roomxi.org
- **Email**: hello@roomxi.org
- **Support**: support@roomxiconnect.org
- **Security**: security@roomxi.org

## ⭐ Star Us!

If you find Room XI Connect helpful, please star this repository!

---

**Built with ❤️ by Room XI for youth across Canada**

