import { ArrowLeft, AlertTriangle, Eye, Bell, ShieldAlert, HelpCircle, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  {
    icon: AlertTriangle,
    title: 'What Triggers the Crisis Flow',
    content: [
      'Ximi automatically checks every message for crisis language before processing it normally.',
      'Crisis keywords include references to self-harm, suicide, or immediate danger.',
      'The detection uses both keyword matching and AI-powered content analysis.',
      'If crisis language is detected, Ximi immediately stops normal conversation and shows crisis resources.',
    ],
  },
  {
    icon: Eye,
    title: 'What Data Is Logged',
    content: [
      'When a crisis is detected, we log: the timestamp, a crisis flag on the conversation, and whether resources were shown.',
      'We do NOT log the specific crisis message content in any reporting system.',
      'The conversation itself remains in your encrypted chat history, which you can delete at any time.',
      'A privacy-preserving hash (SHA-256) of your email is used for crisis follow-up tracking — your actual email is not stored in crisis logs.',
    ],
  },
  {
    icon: Bell,
    title: 'Who Is Notified',
    content: [
      'If crisis responder notifications are configured by the platform administrators, a designated crisis responder may receive an alert.',
      'The alert contains only that a crisis was detected and a timestamp — no message content is shared.',
      'Notification cooldowns prevent duplicate alerts (one per user per time window).',
      'Your parent or guardian is NOT automatically notified of crisis detections.',
    ],
  },
  {
    icon: ShieldAlert,
    title: 'What We Promise and What We Don\'t',
    content: [
      'We promise: crisis resources are always accessible, even without logging in. The floating crisis button is always visible.',
      'We promise: crisis detection runs 24/7 and cannot be bypassed by users or staff.',
      'We do NOT promise: that every crisis situation will be detected. Keyword detection has limits.',
      'We do NOT promise: that a human will respond to every crisis alert. This app is not a substitute for calling 911 or a crisis hotline.',
      'Ximi is not a therapist, counselor, or crisis responder. It is a program finder with a safety interrupter.',
    ],
  },
  {
    icon: Server,
    title: 'What Happens If Systems Fail',
    content: [
      'If the AI service is unavailable, Ximi shows a fallback message with direct links to crisis resources.',
      'Crisis resources (phone numbers, text lines, chat links) are hardcoded in the app and do not depend on any server or API.',
      'If the database is unavailable, the app can still display crisis resources from its built-in list.',
      'The floating crisis button works even when offline.',
    ],
  },
  {
    icon: HelpCircle,
    title: 'If You Need Help Right Now',
    content: [
      'Kids Help Phone: Call 1-800-668-6868 or text CONNECT to 686868',
      'Crisis Text Line: Text HOME to 741741',
      'Emergency: Call 911',
      'These services are free, confidential, and available 24/7.',
    ],
  },
];

export default function CrisisPolicy() {
  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur-sm border-b border-sage/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center space-x-3">
          <Link to="/safety-resources" className="p-2 -ml-2 rounded-lg hover:bg-sage/10 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back to safety resources">
            <ArrowLeft className="w-5 h-5 text-deepSage" />
          </Link>
          <h1 className="text-lg font-display font-bold text-deepSage">Crisis Detection Policy</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6" role="region" aria-label="Crisis detection policy">
        <div className="cosmic-card p-4 bg-coral/5 border-coral/20">
          <p className="text-sm text-deepSage leading-relaxed">
            Room XI Connect includes automatic crisis detection to help connect you with support
            when you need it. This page explains exactly how it works, what data is involved,
            and what you can expect.
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="cosmic-card p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center flex-shrink-0">
                <section.icon className="w-5 h-5 text-coralText" />
              </div>
              <h2 className="font-semibold text-deepSage">{section.title}</h2>
            </div>
            <ul className="space-y-2 text-sm text-textSecondaryLight">
              {section.content.map((item, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-coralText mt-1 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="text-center text-xs text-textSecondaryLight pb-6">
          <p>Last updated: March 2026</p>
        </div>
      </div>
    </div>
  );
}
