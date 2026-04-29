import { ArrowLeft, Eye, MapPin, Bell, Brain, BarChart3, Shield, Download, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const dataItems = [
  {
    icon: Eye,
    title: 'Mood Check-ins',
    what: 'Your daily mood level and wellness dimension ratings',
    why: 'To help you track your emotional wellness over time',
    whoSees: 'Only you, unless you enable sharing with a parent or youth worker',
    howToStop: 'Stop doing check-ins. Delete past data in Settings > Export & Delete.',
  },
  {
    icon: MapPin,
    title: 'Location (optional)',
    what: 'Your approximate location when you tap "Near Me"',
    why: 'To show programs near you',
    whoSees: 'Only used in the moment — never stored on our servers',
    howToStop: 'Don\'t tap "Near Me." Revoke location permission in your device settings.',
  },
  {
    icon: Bell,
    title: 'Push Notifications (optional)',
    what: 'A device token to send you reminders',
    why: 'To remind you about saved programs and check-ins',
    whoSees: 'Only the notification system — no one reads your notifications',
    howToStop: 'Turn off in Settings > Notifications, or in your device settings.',
  },
  {
    icon: Brain,
    title: 'Ximi Conversations',
    what: 'Your messages to Ximi and Ximi\'s responses',
    why: 'To help you find programs and answer your questions',
    whoSees: 'Only you. Messages are processed by OpenAI (US servers) but not stored by them for training.',
    howToStop: 'Disable Ximi in Settings. Delete conversation history in Privacy Center.',
  },
  {
    icon: BarChart3,
    title: 'Program Activity',
    what: 'Programs you save, RSVP to, and attend',
    why: 'To show your schedule, track XiP points, and suggest relevant programs',
    whoSees: 'Only you, unless you enable sharing with a parent or organization',
    howToStop: 'Unsave programs. Your attendance history can be exported and deleted.',
  },
  {
    icon: Shield,
    title: 'Safety Plan (optional)',
    what: 'Your personal crisis support plan',
    why: 'To give you quick access to your support network in difficult moments',
    whoSees: 'Only you, and anyone you explicitly share a link with',
    howToStop: 'Delete your safety plan in the Safety section. Revoke shared links anytime.',
  },
];

export default function PrivacySummary() {
  useTranslation();

  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur-sm border-b border-sage/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center space-x-3">
          <Link to="/settings" className="p-2 -ml-2 rounded-lg hover:bg-sage/10 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back to settings">
            <ArrowLeft className="w-5 h-5 text-deepSage" />
          </Link>
          <h1 className="text-lg font-display font-bold text-deepSage">Your Privacy at a Glance</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6" role="region" aria-label="Privacy summary">
        <div className="cosmic-card p-4 bg-teal/5 border-teal/20">
          <p className="text-sm text-deepSage leading-relaxed">
            Room XI Connect collects only what's needed to help you find programs and track your wellness.
            Everything defaults to <strong>off</strong>. You control what you share.
            No advertising. No data selling. Ever.
          </p>
        </div>

        <div className="space-y-4">
          {dataItems.map((item) => (
            <div key={item.title} className="cosmic-card p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-teal" />
                </div>
                <h2 className="font-semibold text-deepSage">{item.title}</h2>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-deepSage">What we collect: </span>
                  <span className="text-textSecondaryLight">{item.what}</span>
                </div>
                <div>
                  <span className="font-medium text-deepSage">Why: </span>
                  <span className="text-textSecondaryLight">{item.why}</span>
                </div>
                <div>
                  <span className="font-medium text-deepSage">Who sees it: </span>
                  <span className="text-textSecondaryLight">{item.whoSees}</span>
                </div>
                <div>
                  <span className="font-medium text-deepSage">How to stop: </span>
                  <span className="text-textSecondaryLight">{item.howToStop}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cosmic-card p-4 space-y-3">
          <h2 className="font-semibold text-deepSage">Your Rights</h2>
          <div className="space-y-2 text-sm text-textSecondaryLight">
            <div className="flex items-start space-x-2">
              <Download className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" />
              <span><strong>Export your data</strong> — Download everything we have about you anytime in Settings.</span>
            </div>
            <div className="flex items-start space-x-2">
              <Trash2 className="w-4 h-4 text-coralText mt-0.5 flex-shrink-0" />
              <span><strong>Delete your account</strong> — Remove your personal data permanently in Settings. Some anonymized aggregate data may be retained for reporting.</span>
            </div>
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" />
              <span><strong>Withdraw consent</strong> — Turn off any data sharing in your Privacy Center. Changes take effect immediately.</span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-textSecondaryLight pb-6">
          <p>Room XI Connect complies with Alberta's PIPA and Canada's PIPEDA.</p>
          <Link to="/privacy-policy" className="text-teal underline">Read full privacy policy</Link>
        </div>
      </div>
    </div>
  );
}
