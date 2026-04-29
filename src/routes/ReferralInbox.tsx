import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Check,
  X,
  Loader,
  MapPin,
  Clock,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  Star,
} from 'lucide-react';

interface Referral {
  id: string;
  programId: string;
  eventId: string | null;
  status: string;
  notes: string | null;
  sentAt: string;
  createdAt: string;
  programTitle: string;
  programDescription: string | null;
  eventName: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  referrerName: string | null;
}

function formatTime12(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function ReferralInbox() {
  const { t } = useTranslation();
  const [pending, setPending] = useState<Referral[]>([]);
  const [responded, setResponded] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    loadInbox();
  }, []);

  async function loadInbox() {
    try {
      setLoading(true);
      const res = await fetch('/api/referrals/youth/inbox', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPending(data.pending || []);
        setResponded(data.responded || []);
      }
    } catch (err) {
      console.error('Failed to load referral inbox');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(id: string) {
    setActioning(id);
    try {
      const csrfRes = await fetch('/api/auth/csrf-token', { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();

      const res = await fetch(`/api/referrals/youth/${id}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });

      if (res.ok) {
        loadInbox();
      }
    } catch (err) {
      console.error('Failed to accept referral');
    } finally {
      setActioning(null);
    }
  }

  async function handleDecline(id: string) {
    setActioning(id);
    try {
      const csrfRes = await fetch('/api/auth/csrf-token', { credentials: 'include' });
      const { csrfToken } = await csrfRes.json();

      const res = await fetch(`/api/referrals/youth/${id}/decline`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ reason: declineReason }),
      });

      if (res.ok) {
        setDeclineId(null);
        setDeclineReason('');
        loadInbox();
      }
    } catch (err) {
      console.error('Failed to decline referral');
    } finally {
      setActioning(null);
    }
  }

  function statusIcon(status: string) {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'attended': return <Star className="w-4 h-4 text-amber-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'accepted': return t('referrals.status.accepted');
      case 'declined': return t('referrals.status.declined');
      case 'attended': return t('referrals.status.attended');
      case 'missed': return t('referrals.status.missed');
      default: return status;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader className="w-8 h-8 text-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center">
          <Inbox className="w-5 h-5 text-teal" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-deepSage">
            {t('referrals.inbox.title')}
          </h1>
          <p className="text-sm text-textSecondaryLight">
            {t('referrals.inbox.subtitle')}
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-deepSage uppercase tracking-wider">
            {t('referrals.inbox.pending', { count: pending.length })}
          </h2>
          <AnimatePresence>
            {pending.map(ref => (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white rounded-xl border border-teal/20 p-4 shadow-soft space-y-3"
              >
                <div>
                  <h3 className="font-semibold text-deepSage text-lg">{ref.programTitle}</h3>
                  {ref.programDescription && (
                    <p className="text-sm text-textSecondaryLight mt-1 line-clamp-2">{ref.programDescription}</p>
                  )}
                </div>

                {ref.eventName && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-textSecondaryLight">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {ref.eventName}
                    </span>
                    {ref.dayOfWeek && <span>{ref.dayOfWeek}</span>}
                    {ref.startTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime12(ref.startTime)} – {formatTime12(ref.endTime || '')}
                      </span>
                    )}
                    {ref.locationName && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {ref.locationName}
                      </span>
                    )}
                  </div>
                )}

                {ref.notes && (
                  <div className="bg-sage/10 rounded-lg p-3 flex gap-2">
                    <MessageSquare className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-deepSage mb-0.5">
                        {t('referrals.inbox.staffNote')}
                      </p>
                      <p className="text-sm text-textSecondaryLight">{ref.notes}</p>
                    </div>
                  </div>
                )}

                {ref.referrerName && (
                  <p className="text-xs text-textSecondaryLight">
                    {t('referrals.inbox.referredBy', { name: ref.referrerName })}
                  </p>
                )}

                {declineId === ref.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                      placeholder={t('referrals.inbox.declineReasonPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecline(ref.id)}
                        disabled={actioning === ref.id}
                        className="flex-1 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actioning === ref.id ? <Loader className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        {t('referrals.inbox.confirmDecline')}
                      </button>
                      <button
                        onClick={() => { setDeclineId(null); setDeclineReason(''); }}
                        className="px-4 py-2 text-textSecondaryLight hover:text-deepSage text-sm"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(ref.id)}
                      disabled={actioning === ref.id}
                      className="flex-1 py-2.5 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actioning === ref.id ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {t('referrals.inbox.accept')}
                    </button>
                    <button
                      onClick={() => setDeclineId(ref.id)}
                      className="px-4 py-2.5 border border-gray-200 text-textSecondaryLight rounded-lg text-sm hover:border-coral/30 hover:text-coral transition-colors"
                    >
                      {t('referrals.inbox.decline')}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}

      {pending.length === 0 && responded.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-textSecondaryLight">{t('referrals.inbox.empty')}</p>
          <p className="text-sm text-textSecondaryLight mt-1">{t('referrals.inbox.emptyDesc')}</p>
        </div>
      )}

      {responded.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-deepSage uppercase tracking-wider">
            {t('referrals.inbox.history')}
          </h2>
          {responded.map(ref => (
            <div
              key={ref.id}
              className="bg-white rounded-xl border border-gray-100 p-4 opacity-80"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-deepSage">{ref.programTitle}</h3>
                  {ref.eventName && (
                    <p className="text-sm text-textSecondaryLight">{ref.eventName}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  {statusIcon(ref.status)}
                  <span className="capitalize">{statusLabel(ref.status)}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
