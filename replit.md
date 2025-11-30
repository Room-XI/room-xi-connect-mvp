## Overview
Room XI Connect is a youth mental health and wellness application (ages 13-25) providing daily mood check-ins, local program discovery, crisis support, and an AI companion named Ximi. The project aims to empower youth by connecting them with resources and community, with a strong focus on privacy-by-design and a "programs-first" approach. It currently serves over 570 youth, emphasizing universal intake, program discovery, and robust crisis support.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations. Journal feature is disabled for now.

## System Architecture
### UI/UX Decisions
The application features a youth-friendly landing page, a professional "About" page, and a "programs-first" experience. Authentication is smart, prompting sign-in only for authenticated features. A 6-level mood scale with HSL color gradients is used for mood tracking. A two-layer, legally compliant consent system (Alberta PIPA & HIA) with granular toggles is implemented, avoiding gamification. The mood orb uses brand design tokens with a teal-to-gold mist aesthetic and trauma-informed pastel tones. High-contrast accessibility mode is implemented.

### Technical Implementations
The tech stack includes React 18 with TypeScript, Vite 5, React Router v6, Tailwind CSS for the frontend, and Express/Neon PostgreSQL (Drizzle ORM) for the backend. Key features include daily mood tracking with DST-safe streak logic, a trauma-informed AI companion (Ximi) with dual personality modes and real-time crisis detection, QR code attendance tracking, offline support via IndexedDB, and end-to-end encryption for sensitive data. Geo-spatial privacy is ensured using H3 Hex Bucketing with dual k-anonymity thresholds and Laplace noise. The 7-day canvas-based gradient mood orb features a smooth, dreamy pastel aesthetic with pixel-perfect canvas rendering, HSL color interpolation, Gaussian blur, saturation reduction, lightness increase, and smoothstep-based center blending. It includes HiDPI/retina display support, per-day mood aggregation with Variability and Consistency Index analytics, ambient page background tint, privacy-safe PNG export, and accessibility features.

A comprehensive admin dashboard provides real-time analytics and monitoring with role-based access control, live statistics widgets, Recharts visualizations, and an audit log viewer. The admin login implements session regeneration, rate limiting, and bcrypt password hashing. A Demographics Research System allows youth to self-identify across three dimensions (sexual orientation, racial/ethnic identity, gender identity), kept private from parents. Guardian verification separately collects parent perceptions. The admin dashboard features a Demographics Comparison component. A Profile Progress Meter tracks required fields for youth. A Disclosure Request System allows parents to request access to their youth's demographics data, with youth approval/denial and audit logging. Push notifications are implemented via the Web Push API for daily check-in reminders. A Capacitor Mobile Wrapper provides iOS and Android native app functionality.

### Feature Specifications
The application utilizes a 6-level mood system and SAMHSA Wellness Dimensions. Ximi AI includes consent gating, crisis keyword detection, and a persistent "not a clinician" disclaimer. A legally compliant consent system involves basic consent and a second layer for a "Safety Profile" with optional health information. A breach notification system is in place for OIPC compliance. Authenticated users must complete a daily check-in before browsing programs, managed by an "Explore Gate." Ximi proactively supports users during mood declines based on statistical mood variance detection. A dedicated consent flow for Ximi AI requires explicit user opt-in. An outcome tracking system enables youth to share program experiences and view privacy-safe peer insights, utilizing k-anonymity and differential privacy. A Real-Time Event Finder enables discovery of programs currently running in Edmonton with time-based filtering, supporting recurring, one-time, seasonal, and overnight events. The Programs tab uses a grouped view that combines recurring events into single program entries with weekly schedule summaries.

### Location-Based Discovery (Updated Nov 2025)
A compact "Show nearby" toggle replaces the previous card-based location UI. Features include:
- Three radius options: 1km (~12 min walk), 2km (default, ~25 min walk), 5km (~60 min/transit)
- 2km default optimized for Edmonton youth based on transit/bike research
- Permission state handling (prompt, granted, denied) with retry functionality
- localStorage persistence for both location preference and radius selection
- ProgramMap shows radius circle overlay and filters markers within selected distance
- All list views (ProgramList, TodayList) automatically filter and sort by distance when enabled
- Distance badges displayed on program cards when location is active

### Edmonton Youth Programs Database
The database contains over 75 comprehensive Edmonton youth resources across categories such as Mental Health, LGBTQ+ & 2Spirit, Indigenous, Arts & Creative, Sports & Recreation, Employment & Career, and Crisis Support.

## External Dependencies
- **Neon PostgreSQL:** Primary database backend.
- **Replit AI (OpenAI-compatible API):** Powers the Ximi AI companion (gpt-4o-mini).
- **Luxon:** JavaScript library for date and time handling.
- **Zeffy:** Donation platform.
- **Nodemailer:** Used for sending guardian verification emails via Gmail SMTP.
- **h3-js:** H3 hexagon geo-spatial indexing library.
- **html2canvas:** DOM-to-image library for mood orb PNG export.