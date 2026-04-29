import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  bufferPages: true,
  info: {
    Title: 'Room XI Connect - Overview',
    Author: 'Room XI',
    Subject: 'Youth Mental Health Platform',
  }
});

const stream = fs.createWriteStream('Room-XI-Connect-Overview.pdf');
doc.pipe(stream);

const TEAL = '#0D6B6E';
const GOLD = '#C8A951';
const BLACK = '#1A1A1A';
const GRAY = '#4A4A4A';
const pageWidth = doc.page.width - 144;

function sectionHeading(text) {
  if (doc.y > doc.page.height - 130) {
    doc.addPage();
  }
  doc.fontSize(16).font('Helvetica-Bold').fillColor(TEAL).text(text);
  doc.moveTo(72, doc.y + 3).lineTo(72 + pageWidth, doc.y + 3).strokeColor(TEAL).lineWidth(1.5).stroke();
  doc.moveDown(0.5);
}

function subHeading(text) {
  if (doc.y > doc.page.height - 100) {
    doc.addPage();
  }
  doc.fontSize(11.5).font('Helvetica-Bold').fillColor(TEAL).text(text);
  doc.moveDown(0.2);
}

function bodyText(text) {
  doc.fontSize(10.5).font('Times-Roman').fillColor(BLACK).text(text, { lineGap: 3, align: 'justify' });
  doc.moveDown(0.35);
}

// ═══════════════════════════════════════
// TITLE PAGE
// ═══════════════════════════════════════
doc.moveDown(6);
doc.moveTo(72, doc.y).lineTo(72 + pageWidth, doc.y).strokeColor(TEAL).lineWidth(2).stroke();
doc.moveDown(1.5);
doc.fontSize(34).font('Helvetica-Bold').fillColor(TEAL).text('Room XI Connect', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(13).font('Times-Roman').fillColor(GRAY)
  .text('Reimagining Youth Mental Health Through', { align: 'center' })
  .text('Technology, Privacy, and Community', { align: 'center' });
doc.moveDown(2);
doc.moveTo(72 + pageWidth * 0.3, doc.y).lineTo(72 + pageWidth * 0.7, doc.y).strokeColor(GOLD).lineWidth(1).stroke();
doc.moveDown(2);
doc.fontSize(11).font('Helvetica').fillColor(GRAY).text('February 2026', { align: 'center' });
doc.moveDown(0.4);
doc.fontSize(11).font('Helvetica').fillColor(GRAY).text('Prepared by Room XI', { align: 'center' });

// ═══════════════════════════════════════
// PAGE 2: CRISIS + INTRODUCTION
// ═══════════════════════════════════════
doc.addPage();

sectionHeading('A Crisis Unfolding');

bodyText(
  'Canadian youth are in the midst of a mental health crisis that is as urgent as it is underserved. Twenty-six percent of young people between the ages of sixteen and twenty-one now rate their mental health as "fair" or "poor" — more than double the twelve percent recorded in 2019. Sixty-eight percent of mental health problems have their onset before age twenty-five, yet over half of young Canadians who need support are not receiving it. Fifty-seven percent of young adults cite cost as the primary barrier to care, and Alberta allocates just 6.3 percent of its health budget to mental health.'
);

bodyText(
  'In Edmonton, the challenge is compounded. The city has the second-largest urban Indigenous population in Canada, with approximately 1,700 individuals experiencing homelessness — the majority of them young adults — and wholly inadequate supports. Youth in children\'s services are abruptly "aged out" at seventeen, severed from support and thrust into an adult system with no place for them. Families spend weeks navigating fragmented intake processes and paperwork, only to be turned away from programs that are full or that do not serve their age group. This is the gap that Room XI Connect was built to address.'
);

sectionHeading('Introducing Room XI Connect');

bodyText(
  'Room XI Connect is a free, privacy-first digital platform built specifically for youth aged thirteen to twenty-five in Edmonton. It is not a meditation app or a chatbot pretending to be a therapist. It is a bridge — connecting young people to real programs, real community, and real support in their own city. Co-designed with youth voices, it was built on the principle that mental wellness begins with connection, not clinical intake.'
);

bodyText(
  'The platform runs on React 18 with TypeScript, Express.js, and PostgreSQL. Delivered as a progressive web application with offline support via IndexedDB, it works on any device with a browser, requires no app store download, and functions even when connectivity is unreliable. The entire application is available in both English and French.'
);

sectionHeading('A Platform for Every Stakeholder');

bodyText(
  'Room XI Connect provides five distinct portals, each with isolated session management and role-appropriate permissions. Youth aged thirteen to twenty-five — the primary users — discover local programs, complete daily mood check-ins, engage with Ximi (an AI companion), build personalized safety plans, and earn XiP points through gamified wellness activities. Parents and guardians access a dedicated portal with consent-based visibility into their child\'s wellbeing, managing documents and receiving notifications without surveilling. Community organizations list events, manage attendance via QR codes, and access anonymized outcome data. Youth workers benefit from AES-256-GCM encrypted case notes that are consent-verified, time-filterable, and exportable. Administrators oversee operations, user management, audit logs, and privacy compliance.'
);

// ═══════════════════════════════════════
// PAGE 3-4: FEATURES
// ═══════════════════════════════════════
doc.addPage();

sectionHeading('What Makes Room XI Connect Different');

bodyText(
  'The mental health technology landscape is crowded with apps promising wellness through guided breathing and daily affirmations. Room XI Connect takes a fundamentally different approach — starting not with content consumption, but with real-world connection.'
);

subHeading('Programs First');
bodyText(
  'The heart of the platform is its program discovery engine. Rather than offering passive content, Room XI Connect surfaces real programs happening right now in Edmonton: after-school activities, drop-in counseling, peer support groups, cultural events, and recreational programs — all discoverable through time-based filtering and privacy-preserving location-based discovery. Real wellness happens in real communities, not in isolation with a screen.'
);

subHeading('Daily Mood Check-ins');
bodyText(
  'Youth check in daily with a six-level mood scale grounded in SAMHSA wellness dimensions. These check-ins drive personalized recommendations, inform Ximi\'s proactive outreach, and help youth build awareness of emotional patterns. Streak tracking is DST-safe, and mood data feeds into a visual gradient orb reflecting recent trends — making self-awareness tangible and motivating.'
);

subHeading('Ximi — The AI Companion');
bodyText(
  'Ximi is a trauma-informed AI companion with clear boundaries — it is not a therapist, says so explicitly, and never pretends otherwise. It uses crisis keyword detection and sentiment analysis to identify when a young person may be struggling, reaching out proactively during mood declines and guiding users toward real resources when crisis language is detected. Powered by GPT-4o-mini with graceful degradation, Ximi falls back to safe pre-written messages if the AI service is unavailable. Every interaction is consent-gated with clear audit trails.'
);

subHeading('Personal Safety Plans');
bodyText(
  'Youth create structured seven-section crisis support plans including trusted contacts, coping strategies, warning signs, and professional resources. Plans are shareable via secure, time-limited, revocable links — putting crisis preparation directly in the hands of the person who needs it most.'
);

subHeading('Real-Time Event Discovery');
bodyText(
  'The event finder surfaces programs happening today in Edmonton. Location-based discovery uses H3 hexagonal bucketing with dual k-anonymity thresholds and Laplace noise injection — a level of geo-spatial privacy virtually unheard of in consumer applications. Youth find nearby programs without their precise location ever being stored or shared.'
);

subHeading('Gamification and Outcome Tracking');
bodyText(
  'The XiP Points system is a ten-level framework rewarding youth for check-ins, program attendance, Ximi engagement, and safety plan creation. A personal dashboard, activity history, and community leaderboard make positive engagement visible. Youth can also share program experiences, with peers viewing anonymized insights through k-anonymity and differential privacy — no individual is ever identifiable.'
);

subHeading('Encrypted Case Management');
bodyText(
  'Youth workers document interactions through case notes encrypted with AES-256-GCM. Access is consent-verified, notes are filterable by time range, and data is exportable for reporting — giving frontline workers professional tools without compromising youth privacy.'
);

// ═══════════════════════════════════════
// PRIVACY
// ═══════════════════════════════════════

sectionHeading('Privacy as a Core Principle');

bodyText(
  'In an era when youth data is routinely harvested and monetized, Room XI Connect treats privacy as its architectural foundation. The platform is fully compliant with Alberta\'s Personal Information Protection Act (PIPA) and the federal PIPEDA, but compliance is a floor, not a ceiling.'
);

bodyText(
  'A two-tier consent model distinguishes between Room XI\'s own services and third-party program sharing. The system incorporates Mature Minor Doctrine considerations, and every consent decision is explicit, auditable, and revocable. All health data — mood check-ins, safety plans, case notes — is encrypted with AES-256-GCM. Geo-spatial data is anonymized through H3 hexagonal bucketing with dual k-anonymity thresholds and Laplace noise. Crisis notification emails use SHA-256 hashing. Youth control their own privacy settings through a dedicated privacy centre, with server-side enforcement. A breach notification system satisfies OIPC requirements. This level of protection is virtually unheard of in youth-facing apps — proving that engaging, AI-enhanced experiences can coexist with treating every young person\'s data as sacrosanct.'
);

// ═══════════════════════════════════════
// COMPETITIVE LANDSCAPE
// ═══════════════════════════════════════
doc.addPage();

sectionHeading('The Current Landscape — and What Is Missing');

bodyText(
  'To understand why Room XI Connect matters, it is worth examining what currently exists and where each option falls short.'
);

subHeading('Calm and Headspace');
bodyText(
  'At approximately thirteen dollars per month, these meditation apps offer guided exercises for adults seeking stress relief. They are fundamentally passive — no community connection, no crisis support, no program discovery, no awareness of real-world services. For a young person in crisis, a ten-minute breathing exercise is not enough.'
);

subHeading('Woebot');
bodyText(
  'An AI-powered CBT chatbot that has shown clinical promise but operates in isolation from real-world services. Woebot is shifting from consumer access to enterprise healthcare partnerships, limiting public availability. It cannot help a young person find a counseling session happening tonight.'
);

subHeading('BetterHelp and Talkspace');
bodyText(
  'Teletherapy platforms connecting users with licensed therapists at sixty to one hundred dollars per week — prohibitively expensive for most youth. No community integration, no program discovery. BetterHelp\'s 2023 FTC settlement over unauthorized data sharing with advertisers raised serious privacy concerns.'
);

subHeading('Foundry BC');
bodyText(
  'The closest comparison: government-funded, free, youth-focused (ages twelve to twenty-four), with integrated services in British Columbia. But Foundry is BC-only — Alberta has no equivalent. It is primarily a service delivery platform without AI companionship, gamification, or Room XI Connect\'s privacy-first architecture.'
);

subHeading('Kickstand Alberta, Jack.org, and Kids Help Phone');
bodyText(
  'Kickstand is a promising ten-million-dollar federally funded initiative for ages eleven to twenty-five, but it is early-stage and primarily oriented around physical locations. Jack.org and Kids Help Phone provide essential crisis lines and awareness campaigns — vital in acute moments but not platforms for ongoing engagement or wellness tracking.'
);

bodyText(
  'Room XI Connect fills the gap none of these address: a free, privacy-first, community-connected digital platform combining AI companionship, real program discovery, mood tracking, gamified engagement, encrypted case management, and multi-stakeholder coordination — purpose-built for Edmonton\'s youth.'
);

// ═══════════════════════════════════════
// WHY IT CHANGES THE EQUATION
// ═══════════════════════════════════════

sectionHeading('Why Room XI Connect Changes the Equation');

bodyText(
  'Room XI Connect is not another mental health app. It is infrastructure for youth wellness — connecting digital tools with physical communities in a way no existing platform achieves.'
);

subHeading('Meeting Youth Where They Are');
bodyText(
  'On their phones, in their language, with their privacy protected. No intake forms, no waitlists, no insurance required. A young person can begin exploring programs, checking in on their mood, and connecting with support within minutes.'
);

subHeading('Bridging Digital and Physical');
bodyText(
  'Every meditation app and wellness chatbot leaves the user alone with their phone. Room XI Connect is a bridge to real programs, real people, and real community across Edmonton. The digital experience is the doorway; the community is the destination.'
);

subHeading('Privacy as a Right');
bodyText(
  'Every piece of sensitive data is encrypted with AES-256-GCM. Every location is anonymized through H3 hexagonal bucketing. Every consent decision is explicit, auditable, and revocable. These protections exceed what most healthcare systems offer — for a population as vulnerable as youth in crisis, this is not a luxury but a necessity.'
);

subHeading('Empowering Every Stakeholder');
bodyText(
  'Youth track their own wellness, build safety plans, and earn recognition through XiP Points. Parents receive appropriate visibility bounded by consent guardrails. Organizations gain anonymized outcome data. Youth workers access encrypted case management. Everyone benefits; no one\'s privacy is compromised.'
);

subHeading('Built for the Community That Needs It Most');
bodyText(
  'Edmonton has the second-largest urban Indigenous population in Canada, significant newcomer communities, and youth falling through the cracks of a fragmented system. Room XI Connect was built with these communities in mind from the first design decision — not retrofitted after the fact.'
);

subHeading('Youth-First and Privacy-First');
bodyText(
  'Conventional wisdom holds that privacy must be traded for functionality, especially with AI. Room XI Connect proves otherwise — delivering AI companionship, location-based discovery, and gamified engagement while maintaining PIPA/PIPEDA compliance and encryption standards that would satisfy a healthcare auditor.'
);

subHeading('Alberta\'s Answer to Foundry');
bodyText(
  'British Columbia has Foundry. Alberta has been waiting. Room XI Connect is that answer — going further with AI companionship, gamification, multi-portal architecture, and privacy protections that set a new industry standard.'
);

// ═══════════════════════════════════════
// LOOKING FORWARD
// ═══════════════════════════════════════

sectionHeading('Looking Forward');

bodyText(
  'Room XI Connect stands at the beginning of its journey. Pilot readiness has been achieved, and the platform is prepared to serve its first cohort of youth in Edmonton. But the vision extends far beyond a single city. The platform is designed to scale — not just technically, through its modern architecture and progressive web application framework, but philosophically. The principles that guide it — privacy as a right, wellness through community connection, technology built for youth rather than repurposed from adult products — are universal.'
);

bodyText(
  'As Room XI Connect proves its model in Edmonton, the roadmap calls for expansion across Alberta and ultimately across Canada. Each new community will bring its own programs, cultural context, and youth voices into the platform. The mental health crisis facing Canadian youth is real, urgent, and growing. The gap in services — particularly in Alberta — is well-documented and deeply felt. Room XI Connect does not pretend to solve this crisis alone. But it provides something that has been missing: a platform that brings together every stakeholder, protects every piece of data, and connects every young person to community resources that can make a genuine difference in their lives.'
);

bodyText(
  'This is what youth mental health infrastructure looks like. And it starts here.'
);

// ═══════════════════════════════════════
// PAGE NUMBERS (skip title page)
// ═══════════════════════════════════════
const range = doc.bufferedPageRange();
for (let i = 1; i < range.count; i++) {
  doc.switchToPage(i);
  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
    .text(`${i + 1}`, 0, doc.page.height - 50, { align: 'center', width: doc.page.width });
}

doc.end();
stream.on('finish', () => {
  console.log('PDF generated successfully: Room-XI-Connect-Overview.pdf');
});
