# Room XI Connect V3 — Mood Check-In System Explained

## Overview

The **Mood Check-In** is the core interaction point in Room XI Connect. It's a lightweight, quick assessment that youth complete daily (or multiple times) to log their emotional state. This data feeds into the Mood Orb visualization, AI recommendations, and staff dashboards.

---

## 1. What is the Mood Check-In?

**Purpose:** Capture a snapshot of a youth's emotional and wellness state in 2-3 minutes without being intrusive or clinical.

**Frequency:** Ideally daily, but youth can check in multiple times per day.

**Output:** A mood record that includes:
- Mood score (visual representation via the Mood Orb)
- Wellness dimension tags (which areas of life are affected)
- Optional short note
- Timestamp and context

---

## 2. The Mood Check-In Flow (Step-by-Step)

### **Screen 1: Mood Selection (Weather Metaphor)**

**What the user sees:**
- Large, visual mood options presented as weather states (not clinical labels)
- 4 primary moods:
  - ☀️ **Sunny** (Happy, energized, good)
  - ☁️ **Cloudy** (Neutral, okay, uncertain)
  - 🌧️ **Stormy** (Stressed, anxious, overwhelmed)
  - ⚡ **Supernova** (Excited, manic, overstimulated)

**Why this design:**
- **Youth-friendly:** Uses metaphors instead of clinical terms like "depressed" or "anxious"
- **Non-judgmental:** No mood is "bad" — even stormy weather is natural
- **Visual:** Large, colorful buttons with icons are easier to tap on mobile
- **Accessible:** Works for youth who struggle with emotional vocabulary

**Data captured:**
```
{
  checkInId: "chk_12345",
  userId: "youth_456",
  moodType: "stormy",  // sunny | cloudy | stormy | supernova
  timestamp: "2024-10-21T14:30:00Z",
  step: 1
}
```

**What happens next:** Youth taps their mood → advances to Screen 2

---

### **Screen 2: Wellness Dimensions (What's Affected?)**

**What the user sees:**
- 8 wellness dimension cards (SAMHSA framework)
- Each has an emoji + label + optional brief description
- Youth can select 1-3 dimensions that are most relevant to their current mood

**The 8 dimensions:**
1. 💭 **Emotional** — Feelings, mood, emotional stability
2. 💪 **Physical** — Energy, health, sleep, exercise
3. 👥 **Social** — Relationships, connection, loneliness
4. ✨ **Spiritual** — Purpose, meaning, values, faith
5. 🧠 **Intellectual** — Learning, creativity, focus, curiosity
6. 🏡 **Environmental** — Home, safety, surroundings, comfort
7. 💰 **Financial** — Money stress, stability, resources
8. 🎯 **Purpose** — Goals, direction, motivation, future

**Why this design:**
- **Holistic:** Recognizes that mood isn't just about emotions — it's about the whole person
- **Contextual:** Helps youth (and staff) understand *why* they feel a certain way
- **Data-rich:** Staff can see patterns (e.g., "This youth's stress is always social on Mondays")
- **Actionable:** Allows Ximi AI to recommend resources specific to the affected areas

**Data captured:**
```
{
  checkInId: "chk_12345",
  userId: "youth_456",
  moodType: "stormy",
  dimensions: ["social", "emotional"],  // Selected dimensions
  timestamp: "2024-10-21T14:30:00Z",
  step: 2
}
```

**What happens next:** Youth selects dimensions → advances to Screen 3

---

### **Screen 3: Optional Note & Submission**

**What the user sees:**
- A simple text input with placeholder: "What's on your mind? (optional)"
- A submit button: "Complete Check-In"
- Optional toggle: "Share with my staff" (if they have assigned staff)

**Why this design:**
- **Optional:** Reduces friction — youth aren't forced to explain
- **Short-form:** Encourages quick, honest reflections (not journal entries)
- **Consent-based:** Youth control who sees their note
- **Context for AI:** Ximi uses this text to generate personalized prompts

**Data captured:**
```
{
  checkInId: "chk_12345",
  userId: "youth_456",
  moodType: "stormy",
  dimensions: ["social", "emotional"],
  note: "Had a fight with my friend today, feeling really down",
  sharedWithStaff: true,
  timestamp: "2024-10-21T14:30:00Z",
  step: 3,
  completed: true
}
```

**What happens next:** 
1. Data is saved to Firestore
2. A summary is created (see "Summarize-and-Pin Pattern" below)
3. Mood Orb updates in real-time
4. Ximi generates a personalized follow-up prompt
5. Staff dashboard updates with new mood data

---

## 3. Data Flow After Check-In Submission

### **Step A: Save to Firestore**

**Collection:** `mood/{checkInId}`

```javascript
{
  checkInId: "chk_12345",
  userId: "youth_456",
  orgId: "org_789",
  moodType: "stormy",
  moodScore: 3,  // 1-5 scale: 1=stormy, 5=supernova
  dimensions: ["social", "emotional"],
  note: "Had a fight with my friend...",
  sharedWithStaff: true,
  createdAt: "2024-10-21T14:30:00Z",
  tags: ["conflict", "friendship"],  // Auto-extracted by Ximi
  safetyFlags: [],  // Empty if no crisis keywords detected
  embedding: [0.23, 0.45, ...]  // Vector embedding for similarity search
}
```

---

### **Step B: Trigger Summarize-and-Pin Background Job**

**Purpose:** Create a short summary of the mood + key themes for fast retrieval

**Process:**
1. Cloud Function triggers on new mood document
2. Sends to Gemini Flash-Lite (fast, cheap):
   ```
   "Summarize this mood check-in in 1 sentence, extract 2-3 key themes"
   Input: "Had a fight with my friend today, feeling really down"
   Output: "Youth experienced social conflict; feeling sad and isolated"
   ```
3. Stores summary in `mood_summaries/{checkInId}`:
   ```javascript
   {
     checkInId: "chk_12345",
     abstract128: "Youth experienced social conflict; feeling sad",
     keyThemes: ["conflict", "isolation", "sadness"],
     safetyFlags: [],
     embedding: [0.24, 0.46, ...],
     createdAt: "2024-10-21T14:30:00Z"
   }
   ```

**Why this matters:**
- **Fast retrieval:** Staff dashboards show summaries, not full text
- **Privacy:** Full journal stays encrypted; summaries are abstracted
- **Searchable:** Embeddings allow semantic search ("Show me moods related to family issues")
- **Cheap:** Flash-Lite is 1/10th the cost of full Gemini

---

### **Step C: Update Mood Orb**

**Real-time update on youth's home screen:**

The Mood Orb is a **visual blend** of:
1. **Last check-in** (immediate influence) — shifts toward the mood color
2. **14-day weighted average** (ambient state) — shows long-term pattern

**Color mapping:**
- ☀️ Sunny → Bright yellow/gold
- ☁️ Cloudy → Neutral gray/white
- 🌧️ Stormy → Deep blue/purple
- ⚡ Supernova → Vibrant pink/magenta

**Animation:**
- Smooth 2-second transition when mood updates
- Gentle floating animation (not jarring)
- Respects `prefers-reduced-motion` for accessibility

**Data stored:**
```javascript
// In users/{userId}
{
  userId: "youth_456",
  lastMoodCheckIn: "2024-10-21T14:30:00Z",
  lastMoodType: "stormy",
  moodHistory: [
    { date: "2024-10-21", score: 3 },
    { date: "2024-10-20", score: 4 },
    { date: "2024-10-19", score: 2 },
    // ... last 14 days
  ],
  moodOrbBlend: {
    immediate: { h: 240, s: 80, l: 50 },  // HSL color
    ambient: { h: 250, s: 60, l: 55 }     // 14-day average
  }
}
```

---

### **Step D: Ximi AI Generates Follow-Up Prompt**

**Purpose:** Offer personalized support based on the mood + dimensions + note

**Process:**
1. Cloud Function triggers with check-in data
2. Calls Gemini Flash (via AI Gateway):
   ```
   System prompt: "You are Ximi, a supportive AI companion for youth. 
                   Generate a warm, brief follow-up prompt (1-2 sentences) 
                   based on their mood and context."
   
   Input: {
     mood: "stormy",
     dimensions: ["social", "emotional"],
     note: "Had a fight with my friend today, feeling really down",
     recentMoods: ["sunny", "cloudy", "stormy"],  // Last 3 check-ins
     age: 16
   }
   
   Output: "It sounds like your friendship is weighing on you right now. 
            Would you like to talk through what happened, or would you 
            prefer some ideas for feeling better?"
   ```

3. Stores prompt in `ximi_prompts/{checkInId}`:
   ```javascript
   {
     checkInId: "chk_12345",
     userId: "youth_456",
     prompt: "It sounds like your friendship is weighing on you...",
     type: "follow_up",  // follow_up | coping_suggestion | resource_recommendation
     createdAt: "2024-10-21T14:30:00Z"
   }
   ```

4. Notification sent to youth: "Ximi has a message for you"

---

### **Step E: Staff Dashboard Updates**

**What staff see (with consent):**

```
Dashboard → Mood Trends
├─ Today's mood: Stormy (1 check-in)
├─ This week: 3 Sunny, 2 Cloudy, 2 Stormy
├─ Affected dimensions: Social (3x), Emotional (2x)
└─ Recent note: "Had a fight with my friend today..."

Dashboard → Individual Youth Profile
├─ Last check-in: 2 hours ago
├─ Mood: Stormy
├─ Dimensions: Social, Emotional
├─ Engagement: Completed check-in + 1 journal entry today
└─ Action: [View Full Profile] [Send Message]
```

**Data used:**
- `mood/{checkInId}` (if shared with staff)
- `mood_summaries/{checkInId}` (fast retrieval)
- `users/{userId}/moodHistory` (trends)

---

## 4. The Mood Orb Component (Frontend)

### **Props:**
```typescript
interface MoodOrbProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';  // Default: medium (200px)
  interactive?: boolean;  // Default: true (tappable)
  showLabel?: boolean;  // Default: true
  animationDuration?: number;  // Default: 2000ms
}
```

### **State:**
```typescript
interface MoodOrbState {
  immediateColor: HSLColor;  // Current mood
  ambientColor: HSLColor;    // 14-day average
  blendRatio: number;        // 70% ambient, 30% immediate
  isAnimating: boolean;
  lastUpdated: Date;
}
```

### **Interaction:**
- **Tap:** Opens check-in modal
- **Long-press:** Opens Ximi chat with mood context
- **Hover:** Shows tooltip with mood label and date

### **Accessibility:**
- Color + pattern (for colorblind users)
- ARIA labels: "Your mood is stormy, last updated 2 hours ago"
- Respects `prefers-reduced-motion`

---

## 5. Safety & Crisis Detection

### **Real-Time Keyword Scanning**

When a check-in note is submitted, it's scanned for crisis keywords:

```javascript
const crisisKeywords = [
  "suicide", "kill myself", "end it",
  "self-harm", "cut myself", "hurt myself",
  "overdose", "poison",
  "no one cares", "everyone hates me",
  // ... 20+ more keywords
];

if (note.includes(crisisKeyword)) {
  safetyFlags.push({
    keyword: crisisKeyword,
    severity: "high",
    action: "escalate_to_staff"
  });
}
```

### **What happens if crisis keywords detected:**

1. ✋ **Immediate block:** Check-in is saved but not shared with staff yet
2. 🚨 **Safety prompt:** Youth sees:
   ```
   "I noticed you mentioned something serious. 
    Are you safe right now? 
    [Yes, I'm safe] [I need help]"
   ```
3. 📞 **If "I need help":** Show crisis resources:
   - Kids Help Phone: 1-800-668-6868
   - Crisis Text Line: Text HOME to 741741
   - Local emergency: 911
4. 👥 **Staff notification:** If youth confirms safety, staff are notified with full context
5. 🔒 **Privacy:** Youth can choose to share or keep private

---

## 6. Data Relationships & Dependencies

### **Mood Check-In connects to:**

```
mood/{checkInId}
├─ → users/{userId}  (who took it)
├─ → orgs/{orgId}    (which organization)
├─ → mood_summaries/{checkInId}  (AI summary)
├─ → ximi_prompts/{checkInId}    (AI follow-up)
├─ → journals/{entryId}  (optional linked journal entry)
├─ → resources/{resId}   (recommended resources)
└─ → outcomes/{rowId}    (staff logged outcome)
```

### **Mood Orb depends on:**

```
Mood Orb
├─ users/{userId}/lastMoodCheckIn  (most recent)
├─ users/{userId}/moodHistory  (last 14 days)
├─ mood/{checkInId}  (for color mapping)
└─ mood_summaries/{checkInId}  (for tooltip)
```

### **Staff Dashboard depends on:**

```
Staff Dashboard
├─ orgs/{orgId}/youth[]  (assigned youth)
├─ mood/{checkInId}  (if shared with staff)
├─ mood_summaries/{checkInId}  (fast retrieval)
├─ users/{userId}/moodHistory  (trends)
├─ outcomes/{rowId}  (staff-logged outcomes)
└─ referrals/{refId}  (warm referrals)
```

---

## 7. Timing & Performance

### **Check-In Submission Timeline:**

```
T+0ms   → User taps "Complete Check-In"
T+100ms → Firestore write (mood/{checkInId})
T+150ms → Cloud Function triggers (summarize job)
T+200ms → Mood Orb updates (real-time listener)
T+500ms → Gemini Flash-Lite call (summary)
T+1000ms → Ximi prompt generation
T+1500ms → Staff dashboard updates (if shared)
T+2000ms → Notification sent to youth
```

**Key insight:** User sees immediate feedback (Mood Orb update) while background jobs run asynchronously.

---

## 8. Example User Journey

### **Scenario: Jordan's Monday Check-In**

**9:00 AM - Jordan opens the app**
- Mood Orb shows "Cloudy" (neutral) — his average from the weekend
- Notification: "Good morning! How are you feeling today?"

**9:05 AM - Jordan taps Mood Orb**
- Sees 4 mood options
- Taps ☀️ **Sunny** (had a good breakfast, feeling okay)

**9:06 AM - Jordan selects dimensions**
- Taps 💪 **Physical** (slept well)
- Taps 🧠 **Intellectual** (excited about a project at school)

**9:07 AM - Jordan adds optional note**
- Types: "Got 8 hours of sleep, feeling motivated for the day"
- Toggles "Share with my staff" ON (he has a youth worker)
- Taps "Complete Check-In"

**Behind the scenes (9:08 AM):**
1. Check-in saved to Firestore
2. Summary generated: "Youth slept well and feels motivated"
3. Mood Orb smoothly transitions to yellow/gold
4. Ximi generates: "That's awesome! What's the project you're excited about?"
5. Youth worker sees notification: "Jordan checked in with a positive mood"

**9:10 AM - Jordan sees Ximi prompt**
- Opens chat with Ximi
- Talks about his school project
- Ximi suggests: "That sounds creative! Here are some resources for project management"

**Later - Youth Worker checks dashboard**
- Sees Jordan's mood trend: Cloudy → Sunny
- Notes: "Good progress this week"
- Can click to see full check-in details and journal entries

---

## 9. Why This Design Works

| Aspect | Why It Matters |
|--------|---|
| **Weather metaphor** | Youth relate to weather; it's non-clinical and relatable |
| **8 dimensions** | Holistic view; helps identify root causes, not just symptoms |
| **Optional note** | Reduces friction; youth aren't forced to over-explain |
| **Real-time Mood Orb** | Immediate visual feedback; motivates continued engagement |
| **Ximi follow-up** | Personalized support without human delay |
| **Staff visibility** | Enables early intervention; staff aren't flying blind |
| **Safety keywords** | Catches crisis signals; escalates appropriately |
| **Summarize-and-pin** | Fast retrieval; privacy; cost-effective AI usage |
| **Consent-based sharing** | Youth control who sees what; builds trust |

---

## 10. Key Metrics Tracked

For each check-in, the system tracks:

| Metric | Purpose |
|--------|---------|
| **Frequency** | How often is youth checking in? (engagement) |
| **Mood trends** | Is mood improving/declining? (wellness) |
| **Dimension patterns** | Which areas are consistently affected? (intervention) |
| **Ximi engagement** | Does youth respond to AI prompts? (effectiveness) |
| **Staff action** | Did staff respond to shared check-ins? (accountability) |
| **Safety flags** | How many crisis keywords detected? (safety) |
| **Token usage** | How much did this check-in cost in AI tokens? (cost) |

---

## Summary

The **Mood Check-In** is the heartbeat of Room XI Connect. It's:
- **Quick** (2-3 minutes)
- **Safe** (crisis detection, consent-based)
- **Actionable** (feeds into Ximi, staff dashboards, resources)
- **Holistic** (8 dimensions, not just mood)
- **Youth-friendly** (weather metaphors, no judgment)
- **Data-rich** (summaries, embeddings, trends)
- **Cost-effective** (Flash-Lite for summaries, smart routing)

Every check-in creates a data point that helps youth understand themselves better and helps staff support them more effectively.
