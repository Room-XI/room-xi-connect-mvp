# Provider Integration Blueprint
**Room XI Connect - Care Navigator System**
*Version 1.0 - November 2025*

## Overview

This document outlines the technical and legal requirements for integrating external program providers into the Room XI Connect Care Navigator system (Phases 3-4 of the roadmap). Provider integrations enable real-time availability data, automated registration workflows, and barrier reduction features.

## Table of Contents

1. [Integration Goals](#integration-goals)
2. [Technical Architecture](#technical-architecture)
3. [Privacy & Legal Requirements](#privacy--legal-requirements)
4. [API Specifications](#api-specifications)
5. [Data Model](#data-model)
6. [Security Requirements](#security-requirements)
7. [Implementation Phases](#implementation-phases)
8. [Partner Onboarding Process](#partner-onboarding-process)

---

## Integration Goals

### Primary Objectives
- **Real-time availability**: Surface current spots, waitlist lengths, next session dates
- **Reduced friction**: Auto-registration, one-click signup from Ximi recommendations
- **Barrier reduction**: Automated transportation support, financial assistance workflows
- **Outcome tracking**: Bi-directional feedback loop between providers and platform

### Success Metrics
- **Time to enrollment**: <5 minutes from recommendation to confirmed registration
- **Conversion rate**: 40%+ of recommendations lead to program signup
- **Barrier resolution**: 60%+ of identified barriers get resolved
- **Data freshness**: Availability data updated within 1 hour

---

## Technical Architecture

### Integration Patterns

#### 1. **Polling Integration** (Phase 3 - Simplest)
*For providers with existing APIs*

```
Room XI ──[Poll every hour]──> Provider API
         <──[JSON response]────
```

**Requirements:**
- Provider exposes RESTful API endpoints
- Authentication via API key or OAuth2
- Rate limiting: 1 request per hour per program
- Timeout: 30 seconds

**Example Response:**
```json
{
  "program_id": "uuid-123",
  "spots_available": 8,
  "total_capacity": 25,
  "waitlist_length": 3,
  "next_session": "2025-11-15T18:00:00Z",
  "registration_open": true,
  "updated_at": "2025-11-10T14:30:00Z"
}
```

#### 2. **Webhook Integration** (Phase 3 - Recommended)
*For providers with event-driven systems*

```
Provider ──[POST webhook]──> Room XI /webhooks/provider
                          <──[200 OK]──
```

**Webhook Events:**
- `availability.updated` - Spots changed
- `registration.completed` - User enrolled
- `session.scheduled` - New session added
- `waitlist.opened` - Spots freed up

**Security:**
- HMAC signature verification
- IP allowlisting
- Retry logic with exponential backoff

#### 3. **Federated Authentication** (Phase 4 - Advanced)
*For providers requiring direct user auth*

```
User → Room XI → Provider OAuth2 → Room XI (with access token)
```

**Flow:**
1. User clicks "Register" in Room XI
2. OAuth2 authorization with provider (scopes: `profile`, `enrollment`)
3. Room XI stores encrypted access token
4. Auto-registration using delegated auth

---

## Privacy & Legal Requirements

### Data Sharing Agreements

**Required Legal Frameworks:**
1. **Data Processing Agreement (DPA)**
   - Defines provider as "data processor"
   - Room XI retains "data controller" status
   - GDPR Article 28 compliance (if applicable)
   - Alberta PIPA/HIA compliance

2. **Consent Requirements**
   - Explicit user consent before sharing PII with providers
   - Granular opt-in: "Share my contact info with [Provider] for registration"
   - Revocable consent (users can disconnect provider access)

3. **Data Minimization**
   - Only share necessary data (name, email, age range)
   - No sharing of mood check-in data unless explicitly consented
   - No sharing of Ximi conversation logs
   - Pseudonymization where possible

### Audit & Compliance

**Required Capabilities:**
- All data sharing events logged to `audit_log` table
- Quarterly privacy impact assessments
- Provider certification (security practices, data retention policies)
- Right to erasure: Users can delete provider connections

---

## API Specifications

### Room XI Provider API (v1)

**Base URL:** `https://api.roomxi.connect/v1/provider`

#### Authentication
```http
Authorization: Bearer {provider_api_key}
```

#### Endpoints

##### 1. Get Program Availability
```http
GET /programs/{program_id}/availability
```

**Response:**
```json
{
  "spots_available": 12,
  "total_capacity": 20,
  "waitlist_length": 0,
  "next_session_date": "2025-11-15T18:00:00Z",
  "registration_open": true,
  "registration_url": "https://provider.com/register/xyz",
  "updated_at": "2025-11-10T15:00:00Z"
}
```

##### 2. Register User (with consent)
```http
POST /programs/{program_id}/register
Content-Type: application/json

{
  "user_id": "uuid-789",
  "consent_timestamp": "2025-11-10T15:30:00Z",
  "user_data": {
    "first_name": "Jordan",
    "email": "jordan@example.com",
    "age_range": "16-18"
  }
}
```

**Response:**
```json
{
  "registration_id": "reg-456",
  "status": "confirmed",
  "next_steps": "Check your email for session details"
}
```

##### 3. Webhook Receiver
```http
POST /webhooks/provider/{provider_id}
Content-Type: application/json
X-Provider-Signature: {hmac_sha256}

{
  "event": "availability.updated",
  "program_id": "uuid-123",
  "data": { ... }
}
```

---

## Data Model

### Database Schema Additions

#### `provider_feeds` table (already created)
```sql
CREATE TABLE provider_feeds (
  id UUID PRIMARY KEY,
  program_id UUID REFERENCES programs(id),
  spots_available INTEGER,
  total_capacity INTEGER,
  waitlist_length INTEGER,
  next_session_date TIMESTAMPTZ,
  registration_open BOOLEAN DEFAULT TRUE,
  provider_api_key TEXT ENCRYPTED,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT, -- 'success', 'error', 'pending'
  sync_error_message TEXT,
  webhook_url TEXT,
  polling_interval INTEGER DEFAULT 3600,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### New: `provider_connections` table
```sql
CREATE TABLE provider_connections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers(id),
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  consent_timestamp TIMESTAMPTZ NOT NULL,
  consent_revoked BOOLEAN DEFAULT FALSE,
  connection_status TEXT, -- 'active', 'expired', 'revoked'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### New: `providers` table
```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  api_base_url TEXT,
  webhook_secret TEXT ENCRYPTED,
  integration_type TEXT, -- 'polling', 'webhook', 'oauth'
  certification_status TEXT, -- 'pending', 'certified', 'suspended'
  privacy_policy_url TEXT,
  data_retention_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Security Requirements

### Provider Certification Checklist

**Before approving a provider integration:**

✅ **Data Security**
- [ ] Encryption at rest (AES-256 or better)
- [ ] TLS 1.3 for data in transit
- [ ] Regular security audits (annually minimum)
- [ ] Incident response plan documented

✅ **Privacy Practices**
- [ ] Privacy policy publicly accessible
- [ ] Data retention policy ≤ 2 years
- [ ] User data deletion on request (30-day SLA)
- [ ] No sale of user data to third parties

✅ **Technical Standards**
- [ ] API versioning strategy
- [ ] 99.5%+ uptime SLA
- [ ] Rate limiting (prevents abuse)
- [ ] Error logging and monitoring

✅ **Legal Compliance**
- [ ] Alberta PIPA/HIA compliance
- [ ] Youth-serving organization screening (if applicable)
- [ ] Insurance coverage (cyber liability)
- [ ] Signed Data Processing Agreement

---

## Implementation Phases

### Phase 3: Provider Feeds & Auto-Registration (Q1 2026)

**Scope:**
- Polling integration for 3-5 pilot partners
- Real-time availability display in program cards
- One-click registration with consent flow
- Automated follow-up emails

**Technical Work:**
1. Build `ProviderService` (polling logic, data sync)
2. Create provider dashboard (for partners to manage API keys)
3. Implement consent flow UI ("Share my info with XYZ?")
4. Add availability indicators to program cards
5. Build registration tracking (link `recommendation_events` → `provider_connections`)

**Timeline:** 8-12 weeks

### Phase 4: Care Pathways & Federated Auth (Q2-Q3 2026)

**Scope:**
- Multi-step care pathways (assessment → referral → enrollment → outcome)
- OAuth2 federated authentication
- Automated barrier resolution (transportation vouchers, fee waivers)
- Bi-directional outcome sharing

**Technical Work:**
1. Implement OAuth2 flow for provider authentication
2. Build care pathway state machine
3. Create barrier resolution service (integrations with transit, financial aid)
4. Federated learning infrastructure for outcome prediction
5. HIPAA-compliant data handling (if health providers involved)

**Timeline:** 16-24 weeks

---

## Partner Onboarding Process

### 1. Initial Contact & Discovery (Week 1-2)
- Provider completes interest form
- Room XI team conducts preliminary review
- NDA signed (mutual confidentiality)

### 2. Technical Assessment (Week 3-4)
- Provider shares API documentation
- Room XI engineers review integration feasibility
- Security questionnaire completed
- Privacy policy review

### 3. Legal Agreements (Week 5-6)
- Data Processing Agreement drafted
- Terms of Service for provider portal
- Insurance verification
- Signatures collected

### 4. Development & Testing (Week 7-10)
- Sandbox environment provisioned
- API integration built and tested
- User acceptance testing with pilot cohort
- Load testing and performance validation

### 5. Pilot Launch (Week 11-12)
- Soft launch with 25-50 users
- Daily monitoring and issue triage
- Feedback collection (users + provider)
- Iteration based on findings

### 6. Full Production (Week 13+)
- General availability to all users
- Ongoing monitoring and SLA compliance
- Quarterly business reviews
- Feature roadmap collaboration

---

## Sample Provider Agreement (Excerpt)

```
PROVIDER DATA PROCESSING AGREEMENT

This agreement ("DPA") is entered into between:
  - Room XI Connect ("Platform")
  - [Provider Name] ("Provider")

1. PURPOSE
   Provider agrees to integrate with Platform to facilitate youth program
   enrollment and reduce barriers to access.

2. DATA SHARING
   Platform will share the following user data with Provider only with
   explicit user consent:
     - Name (first + last)
     - Email address
     - Age range (13-15, 16-18, 19-21, 22-25)
     - Program preferences

   Provider MUST NOT:
     - Share user data with third parties
     - Use data for marketing purposes
     - Retain data beyond enrollment period + 90 days

3. SECURITY OBLIGATIONS
   Provider must maintain:
     - SOC 2 Type II certification OR equivalent
     - Annual penetration testing
     - 24-hour incident notification to Platform

4. TERMINATION
   Either party may terminate with 30 days notice.
   Upon termination, Provider must delete all user data within 30 days.

[Full agreement available in legal repository]
```

---

## Technical Support Contacts

**For Provider Integration Questions:**
- Email: dev@roomxi.connect
- Developer Portal: https://developers.roomxi.connect
- Slack: #provider-integrations

**For Legal/Privacy Questions:**
- Email: privacy@roomxi.connect
- Phone: [TBD]

---

## Appendix: Reference Implementation

See `/server/services/providerIntegrations.ts` (to be created in Phase 3) for:
- Polling service implementation
- Webhook verification
- OAuth2 flow example
- Error handling patterns

---

**Document Maintainer:** Room XI Engineering Team  
**Last Updated:** November 10, 2025  
**Next Review:** February 2026
