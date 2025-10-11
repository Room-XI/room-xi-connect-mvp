# Room XI Connect - MVP-Lite

A safe space for youth to connect, explore, and grow. Room XI Connect is a trauma-informed mental health application designed specifically for young people, featuring mood tracking, program discovery, and crisis support resources.

## 🌟 Features

### Core Functionality
- **Mood Check-ins**: Interactive mood tracking with the cosmic "Mood Orb"
- **Program Discovery**: Find and explore youth programs and activities
- **QR Code Check-ins**: Attendance tracking for program participation
- **Crisis Support**: Immediate access to crisis resources and support contacts
- **Offline Mode**: Full functionality without internet connection

### Design & Experience
- **Cosmic Garden Design System**: Calm, tranquil aesthetic with cosmic elements
- **Trauma-Informed UX**: Safe, non-judgmental interface design
- **Progressive Web App**: Install on any device, works like a native app
- **Accessibility First**: WCAG 2.1 AA compliant with comprehensive accessibility features

### Security & Privacy
- **Healthcare-Grade Security**: End-to-end encryption and secure data handling
- **GDPR/PHIPA Compliant**: Full privacy compliance for sensitive health data
- **Row-Level Security**: Database-level access controls
- **Audit Logging**: Comprehensive activity tracking for compliance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd room-xi-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Set up database**
   ```bash
   # Run the SQL files in supabase/ directory in your Supabase dashboard
   # 1. schema.sql - Database structure
   # 2. policies.sql - Row Level Security policies
   # 3. seeds/ - Sample data (optional)
   ```

5. **Deploy edge functions**
   ```bash
   # Deploy the Supabase edge functions
   supabase functions deploy xid-create
   supabase functions deploy user-delete
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **Recharts** for data visualization

### Backend & Database
- **Supabase** (PostgreSQL with real-time subscriptions)
- **Row Level Security** for data protection
- **Edge Functions** for server-side logic
- **Real-time subscriptions** for live updates

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

#### Ximi AI Companion
Local heuristic AI system for basic conversation and crisis detection:
- Rule-based responses (no external API calls)
- Crisis keyword detection
- Privacy-preserving (no data sent externally)
- Contextual program suggestions

## 🔒 Security Features

### Data Protection
- **Encryption at Rest**: All sensitive data encrypted in database
- **Encryption in Transit**: HTTPS/WSS for all communications
- **Local Encryption**: Offline queue data encrypted with Web Crypto API
- **XID System**: Anonymous identifiers for attendance tracking

### Access Controls
- **Row Level Security**: Database-level access restrictions
- **JWT Authentication**: Secure session management
- **Role-Based Access**: Admin, user, and guest roles
- **Audit Logging**: All data changes tracked

### Privacy Compliance
- **Data Minimization**: Only collect necessary data
- **Consent Management**: Granular privacy controls
- **Right to Deletion**: Complete data removal capability
- **Data Portability**: Export user data functionality

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

### Components
- **Cosmic Cards**: Elevated surfaces with subtle shadows
- **Breathing Animations**: Gentle, calming motion
- **Gradient Backgrounds**: Subtle cosmic gradients
- **Soft Shadows**: Layered shadow system

## 📱 Progressive Web App

### PWA Features
- **Installable**: Add to home screen on any device
- **Offline First**: Core functionality works without internet
- **Background Sync**: Automatic data synchronization
- **Push Notifications**: Crisis alerts and reminders (future)

### Performance
- **Code Splitting**: Lazy-loaded routes and components
- **Asset Optimization**: Compressed images and fonts
- **Caching Strategy**: Service worker with cache-first approach
- **Bundle Analysis**: Optimized bundle sizes

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Component and utility testing
- **Integration Tests**: API and database interactions
- **E2E Tests**: Full user journey testing
- **Accessibility Tests**: Automated a11y validation

### Security Testing
- **Penetration Testing**: Regular security audits
- **Dependency Scanning**: Automated vulnerability checks
- **OWASP Compliance**: Security best practices
- **Privacy Impact Assessment**: Regular privacy reviews

## 🚀 Deployment

### Build Process
```bash
# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### Environment Setup
1. **Staging Environment**
   - Copy `.env.example` to `.env.staging`
   - Configure staging Supabase project
   - Deploy with staging settings

2. **Production Environment**
   - Copy `.env.example` to `.env.production`
   - Configure production Supabase project
   - Enable all security features
   - Set up monitoring and alerts

### Deployment Platforms
- **Vercel** (recommended for frontend)
- **Netlify** (alternative frontend hosting)
- **Supabase** (backend and database)

## 📊 Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Core Web Vitals tracking
- **User Analytics**: Privacy-compliant usage analytics
- **Health Checks**: Automated system monitoring

### Privacy-First Analytics
- **No Personal Data**: Only aggregate, anonymous metrics
- **Opt-in Only**: Users control analytics participation
- **Local Processing**: Client-side analytics where possible
- **GDPR Compliant**: Full privacy regulation compliance

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Consistent code formatting
- **Prettier**: Automated code formatting
- **Conventional Commits**: Standardized commit messages

### Trauma-Informed Development
- **Safety First**: All features reviewed for emotional safety
- **Inclusive Design**: Accessible to users with diverse needs
- **Crisis Protocols**: Robust crisis detection and response
- **User Agency**: Users maintain control over their experience

## 📚 Documentation

### API Documentation
- **Supabase Schema**: Database structure and relationships
- **Edge Functions**: Server-side function documentation
- **Authentication**: Auth flow and security measures

### User Guides
- **Getting Started**: New user onboarding
- **Feature Guides**: Detailed feature explanations
- **Crisis Resources**: Emergency support information
- **Privacy Guide**: Data handling and privacy controls

## 🆘 Crisis Support

Room XI Connect includes comprehensive crisis support features:

### Immediate Support
- **Crisis Hotlines**: Direct links to crisis support services
- **Text Support**: SMS-based crisis support options
- **Local Resources**: Location-based support services
- **Emergency Contacts**: Quick access to emergency services

### AI Crisis Detection
- **Keyword Monitoring**: Automatic detection of crisis language
- **Escalation Protocols**: Immediate connection to support resources
- **Safety Planning**: Tools for crisis prevention and management

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Youth Mental Health Organizations**: For guidance on trauma-informed design
- **Accessibility Community**: For inclusive design principles
- **Open Source Community**: For the amazing tools and libraries
- **Mental Health Professionals**: For clinical guidance and review

## 📞 Support

For technical support or questions:
- **Documentation**: Check the docs/ directory
- **Issues**: Create a GitHub issue
- **Security**: Email security@roomxi.connect
- **General**: Email support@roomxi.connect

---

**Room XI Connect** - Empowering youth through technology, community, and compassionate care.
