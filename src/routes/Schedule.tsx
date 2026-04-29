import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, MapPin, X, AlertTriangle, CheckCircle, Loader, Ban, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { DateTime } from 'luxon';

interface Rsvp {
  id: string;
  eventId: string;
  programId: string;
  status: 'confirmed' | 'pending_consent' | 'blocked' | string;
  consentRequestId: string | null;
  createdAt: string;
  eventName: string;
  dayOfWeek: string | null;
  startTime: string;
  endTime: string;
  locationName: string | null;
  address: string | null;
  occursOnDate: string | null;
  isRecurring: boolean;
  eventActive: boolean;
  programTitle: string;
  programOrganizer: string | null;
  programFree: boolean;
  nextDate: string | null;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = DateTime.now().setZone('America/Edmonton').toFormat('yyyy-MM-dd');
  return dateStr === today;
}

function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const dt = DateTime.fromISO(dateStr, { zone: 'America/Edmonton' });
  const now = DateTime.now().setZone('America/Edmonton');
  const diff = dt.startOf('day').diff(now.startOf('day'), 'days').days;

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return dt.toFormat('EEEE');
  return dt.toFormat('EEE, MMM d');
}

export default function Schedule() {
  const { t } = useTranslation();
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadRsvps = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await api.eventRsvps.getMyRsvps();
      if (data && !error) {
        setRsvps(data.rsvps || []);
      }
    } catch (err) {
      console.error('Error loading RSVPs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRsvps();
  }, [loadRsvps]);

  const handleCancel = async (rsvpId: string) => {
    setCancellingId(rsvpId);
    try {
      const { error } = await api.eventRsvps.cancel(rsvpId, cancelReason || undefined);
      if (!error) {
        setRsvps(prev => prev.filter(r => r.id !== rsvpId));
        setShowCancelModal(null);
        setCancelReason('');
      }
    } catch (err) {
      console.error('Error cancelling RSVP:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const grouped = rsvps.reduce<Record<string, Rsvp[]>>((acc, rsvp) => {
    const key = rsvp.nextDate || 'unscheduled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(rsvp);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === 'unscheduled') return 1;
    if (b === 'unscheduled') return -1;
    return a.localeCompare(b);
  });

  return (
    <main className="min-h-screen bg-cream px-4 py-8 pb-24">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-teal" />
          <h1 className="text-2xl font-display font-bold text-deepSage">
            {t('schedule.title', 'My Schedule')}
          </h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-borderMutedLight/50 p-5 animate-pulse">
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : rsvps.length === 0 ? (
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-borderMutedLight/50 p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-teal" />
            </div>
            <h2 className="text-lg font-semibold text-deepSage mb-2">
              {t('schedule.emptyTitle', 'Nothing scheduled yet')}
            </h2>
            <p className="text-textSecondaryLight text-sm max-w-sm mx-auto mb-4">
              {t('schedule.emptyDescription', "When you RSVP to events, they'll show up here so you can keep track of your week.")}
            </p>
            <Link
              to="/explore"
              className="inline-flex items-center px-5 py-2.5 bg-teal text-white font-medium rounded-lg hover:bg-teal/90 transition-colors"
            >
              {t('schedule.exploreCta', 'Explore Programs')}
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(dateKey => (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-sm font-semibold text-textSecondaryLight uppercase tracking-wider mb-3">
                  {dateKey === 'unscheduled' ? 'Recurring' : formatDate(dateKey)}
                </h2>

                <div className="space-y-3">
                  {grouped[dateKey].map(rsvp => (
                    <motion.div
                      key={rsvp.id}
                      className="bg-white rounded-xl shadow-sm border border-borderMutedLight/50 p-4"
                      layout
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/program/${rsvp.programId}`}
                            className="font-semibold text-deepSage hover:text-teal transition-colors line-clamp-1"
                          >
                            {rsvp.eventName || rsvp.programTitle}
                          </Link>
                          {rsvp.eventName && rsvp.eventName !== rsvp.programTitle && (
                            <p className="text-xs text-textSecondaryLight mt-0.5">{rsvp.programTitle}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-textSecondaryLight">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(rsvp.startTime)} – {formatTime(rsvp.endTime)}
                            </span>
                            {rsvp.locationName && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[160px]">{rsvp.locationName}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {rsvp.status === 'confirmed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Confirmed
                            </span>
                          )}
                          {rsvp.status === 'pending_consent' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Waiting for consent
                            </span>
                          )}
                          {rsvp.status === 'blocked' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">
                              <Ban className="w-3 h-3" />
                              Blocked
                            </span>
                          )}

                          {rsvp.status !== 'blocked' && (
                            <button
                              onClick={() => setShowCancelModal(rsvp.id)}
                              className="text-xs text-textSecondaryLight hover:text-coral transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      {rsvp.status === 'confirmed' && isToday(rsvp.nextDate) && (
                        <Link
                          to="/attendance-pass"
                          className="mt-3 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-teal text-white text-sm font-medium rounded-lg hover:bg-teal/90 transition-colors"
                        >
                          <QrCode className="w-4 h-4" />
                          Open Attendance Pass
                        </Link>
                      )}

                      {rsvp.status === 'pending_consent' && (
                        <p className="mt-2 text-xs text-amber-700">
                          Your guardian needs to sign consent before you can attend. They'll see the request in their Consent Wallet.
                        </p>
                      )}

                      {rsvp.status === 'blocked' && (
                        <p className="mt-2 text-xs text-rose-700">
                          Consent was not granted or was withdrawn. Contact your guardian if this was a mistake.
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-coral" />
                <h3 className="text-lg font-semibold text-deepSage">Cancel RSVP?</h3>
              </div>
              <p className="text-sm text-textSecondaryLight mb-4">
                Are you sure you want to cancel this RSVP? You can always RSVP again later.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full p-3 border border-sage/30 rounded-lg mb-4 text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(null);
                    setCancelReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-sage/10 text-deepSage rounded-lg hover:bg-sage/20 transition-colors"
                >
                  Keep
                </button>
                <button
                  onClick={() => handleCancel(showCancelModal)}
                  disabled={cancellingId === showCancelModal}
                  className="flex-1 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancellingId === showCancelModal ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Cancel RSVP
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
