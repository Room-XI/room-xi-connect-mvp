import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  QrCode,
  Settings,
  Shield,
  Heart,
  BookmarkCheck,
  History,
  FileText,
  Inbox,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { useSession } from '@/lib/session';
import { ENABLE_SUPPORT_INBOX } from '@/lib/pilotFlags';

export default function More() {
  const { t } = useTranslation();
  const { user } = useSession();

  const menuItems = [
    { to: '/me', icon: User, label: t('more.profile', 'My Profile'), color: 'text-teal' },
    { to: '/qr', icon: QrCode, label: t('more.qrScan', 'Scan QR Code'), color: 'text-teal' },
    { to: '/saved', icon: BookmarkCheck, label: t('more.savedPrograms', 'Saved Programs'), color: 'text-teal' },
    { to: '/referrals', icon: Inbox, label: t('more.referrals', 'My Referrals'), color: 'text-teal' },
    { to: '/attendance-pass', icon: CreditCard, label: t('more.attendancePass', 'Attendance Pass'), color: 'text-teal' },
    { to: '/check-in-history', icon: History, label: t('more.checkInHistory', 'Check-in History'), color: 'text-teal' },
    // XiP Points removed per pilot lockdown (Prompt 1).
    { to: '/safety', icon: Heart, label: t('more.safety', 'Safety & Support'), color: 'text-coral' },
    ...(ENABLE_SUPPORT_INBOX
      ? [{ to: '/support/request', icon: MessageSquare, label: t('more.supportRequest', 'Request Support'), color: 'text-coral' }]
      : []),
    { to: '/privacy-center', icon: Shield, label: t('more.privacyCenter', 'Privacy Center'), color: 'text-sage' },
    { to: '/settings', icon: Settings, label: t('more.settings', 'Settings'), color: 'text-sage' },
    { to: '/about', icon: FileText, label: t('more.about', 'About Room XI'), color: 'text-sage' },
  ];

  return (
    <main className="min-h-screen bg-cream px-4 py-8 pb-24">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-display font-bold text-deepSage">
          {t('more.title', 'More')}
        </h1>

        {user && (
          <p className="text-textSecondaryLight text-sm">
            {t('more.greeting', 'Hey, {{name}}', { name: user.displayName || user.username })}
          </p>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-borderMutedLight/50 divide-y divide-borderMutedLight/30">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-sage/5 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-sm font-medium text-deepSage">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
