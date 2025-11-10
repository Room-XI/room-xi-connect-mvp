## Overview
Room XI Connect is a youth mental health and wellness application (ages 13-25) providing daily mood check-ins, local program discovery, crisis support, and an AI companion named Ximi. The project aims to empower youth by connecting them with resources and community, with a strong focus on privacy-by-design and a "programs-first" approach. It currently serves over 570 youth through local programs and pilots, emphasizing universal intake, program discovery, and robust crisis support.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture
### UI/UX Decisions
The application features a youth-friendly landing page, a professional "About" page, and a "programs-first" experience for unauthenticated users. Authentication is smart, prompting sign-in only for authenticated features. UI adapts for guests versus authenticated users. A 6-level mood scale with HSL color gradients is used for mood tracking. A two-layer, legally compliant consent system (Alberta PIPA & HIA) with granular toggles is implemented, avoiding gamification. The mood orb uses brand design tokens to create a "living sphere of blended light" with a teal-to-gold mist aesthetic, using trauma-informed pastel tones. High-contrast accessibility mode is implemented.

### Technical Implementations
The tech stack includes React 18 with TypeScript, Vite 5, React Router v6, Tailwind CSS for the frontend, and Supabase (PostgreSQL, Auth, Storage) for the backend. Key features include daily mood tracking with DST-safe streak logic, a trauma-informed AI companion (Ximi) with dual personality modes and real-time crisis detection, QR code attendance tracking, offline support via IndexedDB, and end-to-end encryption for sensitive data. Geo-spatial privacy is ensured using H3 Hex Bucketing with dual k-anonymity thresholds and Laplace noise.

The 7-day canvas-based gradient mood orb features a smooth, dreamy pastel aesthetic with pixel-perfect canvas rendering, HSL color interpolation, Gaussian blur, saturation reduction, lightness increase, and smoothstep-based center blending. It includes HiDPI/retina display support, per-day mood aggregation with Variability and Consistency Index analytics, ambient page background tint, privacy-safe PNG export, accessibility features (high-contrast, pattern overlays, color key drawer), and 30-day historical timelapse browsing.

A comprehensive admin dashboard provides real-time analytics and monitoring with role-based access control, live statistics widgets, Recharts visualizations, and an audit log viewer. Push notifications are implemented via the Web Push API, including subscription management, user permission control, and scheduled daily check-in reminders. A Voice/Text Journal Interface utilizes the Web Speech API for accessible voice input and text-to-speech, with privacy-compliant messaging and Safari compatibility. A Capacitor Mobile Wrapper provides iOS and Android native app functionality, including dynamic imports for plugins, splash screens, status bar styling, haptic feedback, and platform detection utilities.

### Feature Specifications
The application utilizes a 6-level mood system and SAMHSA Wellness Dimensions. Ximi AI includes consent gating and crisis keyword detection. A legally compliant consent system involves basic consent and a second layer for a "Safety Profile" with optional health information and granular media consent. A breach notification system is in place for OIPC compliance. Authenticated users must complete a daily check-in by 8 AM (Edmonton time) before browsing programs, managed by an "Explore Gate." Ximi proactively supports users during mood declines based on a statistical mood variance detection service.

A dedicated consent flow for Ximi AI requires explicit user opt-in, displaying comprehensive information about Ximi and its privacy-first design. Backend enforcement ensures all chat requests require user consent. An outcome tracking system enables youth to share program experiences and view privacy-safe peer insights, utilizing k-anonymity and differential privacy for aggregation. Ximi AI integrates with outcome reflection prompts. The system includes an OutcomeReflectionForm and enhances the ProgramDetail page with aggregated peer feedback.

Critical fixes and enhancements to the Ximi AI service ensure reliable program recommendations and mood tracking. This includes updating the OpenAI API to `gpt-4o-mini`, fixing streak calculation date parsing, updating the recommendation scoring algorithm with a `MOOD_TAG_MAP` aligned to program taxonomy, and enhancing the `programs` table schema. The Edmonton programs database is populated with real youth programs, comprehensive tagging, and accessibility details.

A Real-Time Event Finder enables discovery of programs currently running in Edmonton with time-based filtering. It uses a `program_events` database table supporting recurring, one-time, seasonal, and overnight events. Backend API endpoints provide "happening now," "today," "this-weekend," and "later" event listings with Luxon timezone handling for Edmonton. Haversine distance calculation and dynamic sorting by nearest location are supported. An EventCard React component displays event details, and the Events page includes tab navigation, browser Geolocation API integration, loading states, and error handling. The "Happening Now" functionality is also integrated into the Explore page as a first tab option (`/explore/happening-now`), enabling youth to instantly see programs running right now from the main navigation while preserving the default Programs tab at `/explore` for backward compatibility with existing bookmarks and deep links.

## External Dependencies
- **Supabase:** PostgreSQL database, authentication, and storage.
- **Neon PostgreSQL:** Primary database backend.
- **Replit AI (OpenAI-compatible API):** Powers the Ximi AI companion.
- **Luxon:** JavaScript library for date and time handling.
- **Zeffy:** Donation platform.
- **Nodemailer:** Used for sending guardian verification emails via Gmail SMTP.
- **h3-js:** H3 hexagon geo-spatial indexing library.
- **html2canvas:** DOM-to-image library for mood orb PNG export.