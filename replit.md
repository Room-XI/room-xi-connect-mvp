## Overview
Room XI Connect is a youth mental health and wellness application (ages 13-25) designed to provide daily mood check-ins, local program discovery, crisis support, and an AI companion named Ximi. The project aims to empower youth by connecting them with resources and community, with a strong focus on privacy-by-design and a "programs-first" approach. It currently serves over 570 youth through local programs and pilots, emphasizing universal intake, program discovery, and robust crisis support.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture
### UI/UX Decisions
The application features a youth-friendly landing page, a separate professional "About" page for stakeholders, and a "programs-first" experience allowing unauthenticated users to browse resources. Authentication is smart, prompting sign-in only for authenticated features. UI adapts for guests versus authenticated users. A 6-level mood scale with HSL color gradients is used for mood tracking, and a two-layer, legally compliant consent system (Alberta PIPA & HIA) with granular toggles is implemented, avoiding gamification.

### Technical Implementations
The tech stack includes React 18 with TypeScript, Vite 5, React Router v6, Tailwind CSS for the frontend, and Supabase (PostgreSQL, Auth, Storage) for the backend. Key features include daily mood tracking with DST-safe streak logic (Luxon), a trauma-informed AI companion (Ximi) with dual personality modes and real-time crisis detection, QR code attendance tracking, offline support via IndexedDB, and end-to-end encryption for sensitive data. Deployment is configured for Replit, and the database schema includes tables for wellness dimensions, Ximi conversations, guardian verifications, health profiles, consent events, and breach events. Geo-spatial privacy is ensured using H3 Hex Bucketing with dual k-anonymity thresholds and Laplace noise. High-contrast accessibility mode is implemented via `@media (prefers-contrast: more)` for enhanced visibility.

### Feature Specifications
The application utilizes a 6-level mood system and SAMHSA Wellness Dimensions. Ximi AI includes consent gating and crisis keyword detection. A legally compliant consent system involves a basic consent layer during account creation and a second layer for a "Safety Profile" with optional health information and granular media consent. A breach notification system is in place for OIPC compliance. Authenticated users must complete a daily check-in by 8 AM (Edmonton time) before browsing programs, a feature managed by an "Explore Gate." Ximi proactively supports users during mood declines based on a statistical mood variance detection service.

## External Dependencies
- **Supabase:** PostgreSQL database, authentication, and storage.
- **Neon PostgreSQL:** Primary database backend.
- **Replit AI (OpenAI-compatible API):** Powers the Ximi AI companion.
- **Luxon:** JavaScript library for date and time handling.
- **Zeffy:** Donation platform.
- **Nodemailer:** Used for sending guardian verification emails via Gmail SMTP.
- **h3-js:** H3 hexagon geo-spatial indexing library.