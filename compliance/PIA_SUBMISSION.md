# Privacy Impact Assessment (PIA) Submission
## Room XI Connect - Youth Mental Health & Wellness Platform

**Submission Date:** [To be completed]  
**Submitted To:** Office of the Information and Privacy Commissioner (OIPC) of Alberta  
**Project Lead:** [To be completed]  
**Contact Email:** [To be completed]

---

## Executive Summary

Room XI Connect is a trauma-informed, privacy-first youth mental health platform (ages 13-25) providing daily mood tracking, program discovery, and AI companion support. This PIA addresses data handling practices, consent mechanisms, and privacy safeguards implemented in compliance with Alberta's Personal Information Protection Act (PIPA) and Health Information Act (HIA).

---

## 1. Project Description

### Purpose
Room XI Connect helps youth (ages 13-25) feel seen, build capacity, and find community through:
- Daily mood check-ins with 6-level weather metaphor system
- Program discovery with map view
- Ximi AI companion (opt-in only)
- QR attendance tracking
- Encrypted living journal

### Target Users
- Primary: Youth aged 13-25 in Alberta
- Secondary: Youth-serving organizations, schools, community programs
- Total Reach: 570+ youth through local pilots

### Data Residency
All data stored in Canada using Neon PostgreSQL (AWS Canada region)

---

## 2. Personal Information Collected

### Layer 1: Account Creation (Minimum Required)
- Name (first, preferred)
- Age (13-25 verification)
- City
- Email address
- Password (hashed with bcrypt)

### Layer 2: Safety Profile (Optional)
- Legal name
- Emergency contact information
- Health information (HIA-compliant, fully optional)
- Indigenous self-identification (optional, sovereignty-respecting)

### Automatically Collected
- Check-in timestamps (America/Edmonton timezone)
- Mood selections (6-level system: Cold, Stormy, Foggy, Clear, Breezy, Aurora)
- Wellness dimension tags
- Optional mood notes
- Program views and saved programs
- XID hash (anonymized identifier for aggregates)

### AI Conversation Data (Opt-in Only)
- Ximi chat conversations (only if AI personalization consent granted)
- Crisis keyword detections
- Response preferences

---

## 3. Consent Architecture

### Two-Layer Consent Model

**Layer 1 - Account Creation:**
- Terms of Use acceptance
- Privacy Notice acknowledgment
- Basic data collection consent
- Default: All OFF until actively granted

**Layer 2 - Feature-Specific:**
- Location services (for map view)
- Orb sharing with staff
- Journal reflections
- Push notifications
- Research participation
- AI personalization (Ximi)
- Daily reflective quotes

### Guardian Verification
- Required for users under 16 years old
- Email verification sent to guardian
- Guardian must approve before account activation
- Uses Gmail SMTP with secure environment variables

### Consent Management
- Granular toggles in Privacy Center
- Can be revoked at any time
- Monthly reminder cap (max 1 reminder/month)
- All consent changes logged to immutable audit log

---

## 4. Privacy Safeguards

### 4.1 Differential Privacy
- **Mechanism:** Laplace noise
- **Epsilon:** 0.5 (reviewed annually)
- **Threshold:** N >= 7 before rendering any aggregate
- **Application:** Server-side before visualization/export
- **Logging:** All DP applications logged to dp_applications table

### 4.2 Data Encryption
- **In Transit:** HTTPS/TLS 1.3
- **At Rest:** AES-256-GCM for journal entries
- **Passwords:** bcrypt hashing (cost factor 12)
- **Session Data:** Encrypted session storage

### 4.3 Anonymization
- XID hash system for community aggregates
- IP addresses SHA256 hashed in audit logs
- No personally identifiable information in public dashboards

### 4.4 Access Controls
- Session-based authentication (7-day expiry)
- Role-based access (youth, staff, admin)
- Admin-only endpoints for sensitive operations

### 4.5 Data Minimization
- No data collected without active consent
- Optional fields clearly marked
- Default consent state: OFF

---

## 5. Data Retention & Deletion

### Retention Periods
- Check-ins: Retained while account active
- Journal entries: Retained while account active
- Ximi conversations: 90 days (if opted in)
- Audit logs: 7 years (compliance requirement)
- Weekly orb snapshots: 52 weeks (1 year)

### User Rights
- **Access:** Users can export all their data via /api/profile/export
- **Correction:** Users can update profile information
- **Deletion:** Full account deletion within 30 days of request
- **Portability:** Data export in CSV/JSON format

### Deletion Process
1. User requests deletion via Privacy Center
2. System marks account for deletion
3. 30-day grace period (account deactivated but recoverable)
4. After 30 days: Permanent deletion of all personal data
5. Anonymized aggregates retained for research (no PII)

---

## 6. Third-Party Services

### Neon PostgreSQL
- **Purpose:** Database hosting
- **Data Residency:** Canada (AWS)
- **Compliance:** SOC 2, GDPR-compliant
- **Data Shared:** All user data (encrypted at rest)

### Replit AI (OpenAI-compatible)
- **Purpose:** Ximi AI companion responses
- **Data Residency:** [To be verified]
- **Data Shared:** Mood context, user messages (if opted in)
- **Retention:** Not stored by third party

### Gmail SMTP
- **Purpose:** Guardian verification emails
- **Data Shared:** Guardian email addresses, verification links
- **Retention:** Email delivery only, not stored

### Zeffy (Donations)
- **Purpose:** Donation processing
- **Data Shared:** None - external link only
- **Integration:** No data exchange with Room XI platform

---

## 7. Crisis Response

### Crisis Detection System
- **Keywords:** Monitored in check-in notes and Ximi conversations
- **Process:** Automatic flagging + routing to safety resources
- **Response:** Immediate display of crisis hotlines and local resources
- **Logging:** Crisis events logged for organizational response tracking
- **Privacy:** Crisis flags visible to assigned staff only (with consent)

### Crisis Resources
- Kids Help Phone: 1-800-668-6868
- Alberta Mental Health Help Line: 1-877-303-2642
- Calgary Distress Centre: 403-266-4357
- Edmonton Distress Line: 780-482-4357

---

## 8. Ximi AI Companion - Specific Assessment

### AI Use & Limitations
- **Purpose:** Peer-like support and resource recommendations
- **Limitations:** NOT diagnostic, NOT therapy, NOT crisis intervention
- **Disclosure:** Clear AI disclosure on every conversation
- **Modes:** Little Sibling (default), Peer Guide (toggle)

### Bias Mitigation
- **Training:** Grade 7-8 reading level, trauma-informed tone
- **Dialogue Pack:** 36 unique responses (6 moods × 2 modes × 3 stages)
- **Crisis Handling:** Immediate routing to human resources, no AI crisis support
- **Audit:** Quarterly bias audit (see XIMI_BIAS_AUDIT.md)

### Consent Gating
- Ximi disabled by default
- Requires explicit "AI Personalization" consent
- Can be disabled at any time in Privacy Center
- All conversations deletable by user

---

## 9. Youth Comprehension Study

### Mood Orb Legend Study
- **Purpose:** Verify youth understand 6-level mood metaphors
- **Protocol:** See YOUTH_COMPREHENSION_STUDY.md
- **Sample Size:** 30+ youth (ages 13-25)
- **Method:** Visual recognition test + verbal explanation
- **Success Criteria:** 80%+ comprehension rate

### Findings
- [To be completed after study]

---

## 10. Transparency & Accountability

### Public Transparency Dashboard
- **URL:** /transparency
- **Contents:** Community aggregates with differential privacy
- **Update Frequency:** Daily
- **Disclaimer:** "Mood visuals are self-reported reflections, not diagnostic indicators."

### Consent Audit Log
- **Purpose:** Track all consent changes
- **Fields:** user_xid, type, action, timestamp, source
- **Properties:** Append-only, immutable (PostgreSQL triggers)
- **Export:** CSV export for audits
- **Retention:** 7 years

### Breach Notification
- **Protocol:** See INCIDENT_RESPONSE.md
- **Notification Window:** 72 hours (OIPC requirement)
- **Communication:** Email + in-app notification
- **Tracking:** breach_events table

---

## 11. Risk Assessment

### Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Unauthorized data access | Low | High | Encryption, access controls, audit logs |
| Youth sharing sensitive info with Ximi | Medium | Medium | Crisis detection, clear AI limitations, staff oversight |
| Re-identification from aggregates | Low | High | Differential privacy (ε=0.5), N>=7 threshold |
| Guardian verification bypass | Low | Medium | Email verification, under-16 restriction |
| Data breach | Low | High | Encryption, monitoring, incident response plan |

---

## 12. Compliance Certifications

### Current Status
- [ ] OIPC PIA Review Complete
- [ ] Alberta HIA Compliance Verified
- [ ] Indigenous Data Sovereignty Consultation
- [ ] Accessibility Audit (WCAG 2.1 AA)
- [ ] Youth Comprehension Study Complete
- [ ] Ximi Bias Audit Complete

### Ongoing Compliance
- Quarterly Ximi bias audits
- Annual differential privacy epsilon review
- Monthly consent audit log exports
- Weekly backup verification

---

## 13. Contact Information

**Privacy Officer:** [To be completed]  
**Email:** [To be completed]  
**Phone:** [To be completed]  
**Address:** [To be completed]

**Data Protection Officer (if applicable):** [To be completed]

---

## 14. Appendices

### Appendix A: Data Flow Diagrams
[To be attached]

### Appendix B: Ximi Bias Audit Results
See: XIMI_BIAS_AUDIT.md

### Appendix C: Youth Comprehension Study
See: YOUTH_COMPREHENSION_STUDY.md

### Appendix D: Consent Forms
See: /docs/consent_forms/

### Appendix E: Technical Security Specifications
See: /docs/security/TECHNICAL_SPECS.md

---

**Document Version:** 1.0  
**Last Updated:** [Date]  
**Next Review:** [Date + 1 year]

---

## Submission Checklist

- [ ] All sections completed
- [ ] Ximi bias audit attached
- [ ] Youth comprehension study attached
- [ ] Data flow diagrams attached
- [ ] Consent forms included
- [ ] Technical specifications included
- [ ] Organizational signatures obtained
- [ ] Legal review complete
- [ ] Submit to OIPC via secure portal
- [ ] Track receipt ID in pia_submission_receipt.md
