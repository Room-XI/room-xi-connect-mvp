# Breach Notification Runbook

## Overview
This runbook outlines the procedures for handling data breaches in compliance with Alberta's Personal Information Protection Act (PIPA) and Health Information Act (HIA).

**CRITICAL**: Alberta PIPA requires notification to the Office of the Information and Privacy Commissioner (OIPC) **within 72 hours** of discovering a breach.

---

## 1. Immediate Actions (0-4 hours)

### Step 1.1: Contain the Breach
- [ ] Isolate affected systems
- [ ] Revoke compromised credentials
- [ ] Block unauthorized access vectors
- [ ] Preserve evidence (logs, screenshots, network traffic)

### Step 1.2: Assess the Scope
- [ ] Identify what data was accessed/disclosed
- [ ] Determine number of affected users
- [ ] Classify data sensitivity (PII, health data, minors)
- [ ] Assess if youth under 16 are affected (guardian notification required)

### Step 1.3: Document Everything
- [ ] Create incident log with timeline
- [ ] Screenshot evidence before it changes
- [ ] Record all personnel involved
- [ ] Note discovery time and method

---

## 2. Severity Classification (4-8 hours)

### Severity Levels

**CRITICAL**: 
- Health data (HIA-protected)
- Youth under 16 personal data
- Credentials or authentication data
- Large-scale exposure (100+ users)
- Public disclosure of sensitive data

**HIGH**: 
- Emergency contact information
- Guardian information
- Consent records
- 10-99 users affected

**MEDIUM**: 
- Check-in notes
- Program preferences
- 1-9 users affected

**LOW**: 
- Public program data only
- No PII exposed

---

## 3. OIPC Notification (Within 72 hours)

### When OIPC Notification is Required

**Required if:**
- Real risk of significant harm to individuals
- Health information exposed (HIA requirement)
- Youth under 16 affected
- Credentials compromised
- Severity: HIGH or CRITICAL

**Not Required if:**
- Only public data (programs, crisis resources)
- Severity: LOW
- No personal information exposed

### How to Notify OIPC

**Phone**: 780-422-6860 (Edmonton)  
**Email**: generalinfo@oipc.ab.ca  
**Online Form**: https://www.oipc.ab.ca/report-a-breach/

**Information to Provide**:
1. Organization name: Room XI Connect
2. Contact person and title
3. Date and time breach discovered
4. Description of breach
5. Number of individuals affected
6. Types of personal information involved
7. Steps taken to mitigate harm
8. Whether individuals have been notified

### Record OIPC Response
- [ ] Log OIPC reference number in breach event
- [ ] Note notification method and timestamp
- [ ] Document any OIPC guidance or requirements

---

## 4. Individual Notification (Within 72 hours)

### Who to Notify

**Direct Notification Required**:
- All affected youth users
- Guardians of youth under 16
- Staff/admins if credentials compromised

### Notification Content

**Email Template**:
```
Subject: Important Security Notice - Room XI Connect

Dear [Name],

We are writing to inform you of a security incident that may have affected your personal information on Room XI Connect.

What Happened:
[Brief description of the breach]

What Information Was Involved:
[List of data types: name, email, check-in data, etc.]

What We're Doing:
[Steps taken to address the breach and prevent recurrence]

What You Should Do:
[Specific actions: change password, monitor accounts, etc.]

Support:
If you have questions or concerns, please contact us at:
- Email: support@roomxiconnect.org
- Phone: [Support number]

We take the privacy and security of your information very seriously and sincerely apologize for this incident.

Sincerely,
Room XI Connect Team
```

### Record Notifications
- [ ] Log individual notification timestamp
- [ ] Log guardian notification timestamp (if applicable)
- [ ] Save copy of notification sent

---

## 5. Remediation (Ongoing)

### Immediate Remediation
- [ ] Patch security vulnerabilities
- [ ] Reset compromised credentials
- [ ] Update access controls
- [ ] Deploy security improvements

### Long-term Remediation
- [ ] Conduct security audit
- [ ] Update security policies
- [ ] Provide staff training
- [ ] Implement additional monitoring

### Documentation
- [ ] Document all remediation steps
- [ ] Create incident post-mortem
- [ ] Update security procedures
- [ ] Log remediation completion timestamp

---

## 6. Using the Breach Management System

### Creating a Breach Event (Admin Dashboard)

1. Navigate to Admin → Breach Events
2. Click "Create Breach Event"
3. Fill in required fields:
   - **Breach Type**: unauthorized_access, data_loss, ransomware, insider_threat, accidental_disclosure, other
   - **Severity**: critical, high, medium, low
   - **Affected User Count**: Number of users
   - **Description**: Detailed description
   - **OIPC Notification Required**: Yes/No
   - **Discovered At**: Date/time of discovery

4. Submit to create event

### Updating Breach Event

As you progress through the runbook:

1. **After OIPC Notification**:
   - Update `oipcNotifiedAt` timestamp
   - Add `oipcNotificationMethod` (phone, email, online)
   - Add `oipcReferenceNumber` from OIPC

2. **After Individual Notification**:
   - Update `individualsNotifiedAt` timestamp
   - Add `notificationMethod` (email, phone, mail)
   - Update `guardiansNotifiedAt` if applicable

3. **After Remediation**:
   - Update `remediationSteps` with detailed actions
   - Update `remediationCompletedAt` when complete

### API Endpoints

**Get all breaches** (Admin only):
```bash
GET /api/breach
```

**Create breach event** (Admin only):
```bash
POST /api/breach
{
  "breachType": "unauthorized_access",
  "severity": "high",
  "affectedUserCount": 25,
  "description": "...",
  "oipcNotificationRequired": true,
  "discoveredAt": "2024-10-31T10:30:00Z"
}
```

**Update breach event** (Admin only):
```bash
PATCH /api/breach/:id
{
  "oipcNotifiedAt": "2024-10-31T14:15:00Z",
  "oipcNotificationMethod": "phone",
  "oipcReferenceNumber": "2024-BR-1234"
}
```

---

## 7. Legal and Compliance

### Laws and Regulations
- **Alberta PIPA**: Personal Information Protection Act
- **Alberta HIA**: Health Information Act
- **PIPEDA**: Federal privacy law (backup)

### Key Requirements
- **72-hour notification** to OIPC (PIPA)
- **Notification to individuals** without unreasonable delay
- **Documentation** of breach and response
- **Remediation** to prevent recurrence

### Legal Contacts
- **OIPC**: 780-422-6860 | generalinfo@oipc.ab.ca
- **Legal Counsel**: [Your lawyer contact]

---

## 8. Contact Information

### Internal Contacts
- **Tech Lead**: [Name, phone, email]
- **Executive Director**: [Name, phone, email]
- **Board Chair**: [Name, phone, email]

### External Contacts
- **OIPC**: 780-422-6860
- **Legal Counsel**: [Law firm contact]
- **Cybersecurity Consultant**: [If applicable]

---

## 9. Post-Incident Review

Within 2 weeks of breach resolution:

- [ ] Conduct team post-mortem
- [ ] Document lessons learned
- [ ] Update security policies
- [ ] Update this runbook
- [ ] Provide staff training on findings
- [ ] Report to board of directors

---

## Appendix A: Breach Event Schema

```typescript
{
  id: UUID,
  breachType: 'unauthorized_access' | 'data_loss' | 'ransomware' | 'insider_threat' | 'accidental_disclosure' | 'other',
  severity: 'low' | 'medium' | 'high' | 'critical',
  affectedUserCount: number,
  affectedUserIds: UUID[],
  description: string,
  
  // OIPC Notification
  oipcNotificationRequired: boolean,
  oipcNotifiedAt: timestamp,
  oipcNotificationMethod: string,
  oipcReferenceNumber: string,
  
  // Individual Notification
  individualsNotifiedAt: timestamp,
  notificationMethod: string,
  guardiansNotifiedAt: timestamp,
  
  // Remediation
  remediationSteps: string,
  remediationCompletedAt: timestamp,
  
  // Timestamps
  discoveredAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Quick Reference Checklist

- [ ] **0-4h**: Contain breach, assess scope, document
- [ ] **4-8h**: Classify severity, determine OIPC notification requirement
- [ ] **Within 72h**: Notify OIPC (if required)
- [ ] **Within 72h**: Notify affected individuals and guardians
- [ ] **Ongoing**: Implement remediation
- [ ] **2 weeks**: Conduct post-incident review

**Remember: When in doubt, notify. It's better to over-communicate than under-communicate.**
