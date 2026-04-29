import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  QrCode,
  RefreshCw,
  Shield,
  Clock,
  CheckCircle,
  Loader,
  AlertCircle,
  Calendar,
  MapPin,
  Radio,
} from 'lucide-react';
import { fetchApi } from '../lib/api';

interface AttendancePassData {
  id: string;
  passToken: string;
  tokenExpiresAt: string;
  active: boolean;
}

interface UpcomingEvent {
  eventId: string;
  eventName: string;
  programTitle: string;
  dayOfWeek: string | null;
  startTime: string;
  endTime: string;
  locationName: string | null;
}

interface OpenSession {
  sessionId: string;
  eventId: string;
  eventName: string;
  programTitle: string;
}

export default function AttendancePass() {
  const navigate = useNavigate();
  const [pass, setPass] = useState<AttendancePassData | null>(null);
  const [displayName, setDisplayName] = useState('Youth');
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [openSessions, setOpenSessions] = useState<OpenSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPass = useCallback(async () => {
    try {
      const res = await fetchApi('/attendance-pass/me');
      if (res.data) {
        setPass(res.data.pass);
        setDisplayName(res.data.displayName || 'Youth');
        setUpcomingEvents(res.data.upcomingEvents || []);
        setOpenSessions(res.data.openSessions || []);
      }
    } catch (err) {
      console.error('Failed to load pass');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPass();
  }, [loadPass]);

  useEffect(() => {
    if (pass?.tokenExpiresAt) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((new Date(pass.tokenExpiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          autoRotate();
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [pass?.tokenExpiresAt]);

  const generatePass = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetchApi('/attendance-pass/generate', {
        method: 'POST',
      });
      if (res.data?.pass) {
        setPass(res.data.pass);
      } else {
        setError(res.error || 'Failed to generate pass');
      }
    } catch (err) {
      setError('Failed to generate pass');
    } finally {
      setGenerating(false);
    }
  };

  const autoRotate = async () => {
    try {
      const res = await fetchApi('/attendance-pass/rotate', {
        method: 'POST',
      });
      if (res.data?.pass) {
        setPass(res.data.pass);
      }
    } catch (err) {
      console.error('Auto-rotate failed');
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const qrValue = pass?.passToken ? `rxipass:${pass.passToken}` : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader className="w-8 h-8 text-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal/5 to-cream">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="p-2 hover:bg-gray-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-deepSage" />
          </button>
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-teal" />
            <h1 className="text-lg font-display font-bold text-deepSage">My Attendance Pass</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-coral/10 border border-coral/30 rounded-lg p-3 flex items-center gap-2 text-sm text-coralText">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!pass ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-teal/10 rounded-full mx-auto flex items-center justify-center">
              <QrCode className="w-10 h-10 text-teal" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-deepSage">Get Your Pass</h2>
              <p className="text-sm text-textSecondaryLight mt-2">
                Generate an attendance pass to check in to programs. Show the QR code to staff or scan at a kiosk.
              </p>
            </div>
            <button
              onClick={generatePass}
              disabled={generating}
              className="w-full py-3 bg-teal text-white font-medium rounded-xl hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {generating ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <QrCode className="w-5 h-5" />
                  Generate Pass
                </>
              )}
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={pass.passToken}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="bg-gradient-to-r from-teal to-teal/80 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Room XI Connect</p>
                    <p className="font-display font-bold text-lg mt-0.5">{displayName}</p>
                  </div>
                  <Shield className="w-6 h-6 text-white/60" />
                </div>
              </div>

              <div className="p-6 flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-inner">
                  <QRCodeSVG
                    value={qrValue}
                    size={200}
                    level="M"
                    includeMargin={false}
                    bgColor="#FFFFFF"
                    fgColor="#2D3B36"
                  />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-textSecondaryLight" />
                  <span className={`font-mono font-medium ${timeLeft <= 15 ? 'text-coral' : 'text-deepSage'}`}>
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-textSecondaryLight">remaining</span>
                </div>

                {timeLeft <= 15 && timeLeft > 0 && (
                  <p className="text-xs text-textSecondaryLight animate-pulse">Auto-refreshing soon...</p>
                )}

                <div className="w-full pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-textSecondaryLight">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Show this QR code to staff or scan at a kiosk to check in</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-textSecondaryLight">
                    <RefreshCw className="w-3.5 h-3.5 text-teal mt-0.5 flex-shrink-0" />
                    <span>Your pass rotates automatically for security</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {openSessions.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-green-600" />
              <h2 className="text-sm font-semibold text-deepSage">Live Sessions</h2>
            </div>
            {openSessions.map(s => (
              <div key={s.sessionId} className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-medium text-deepSage">{s.eventName}</p>
                <p className="text-xs text-textSecondaryLight">{s.programTitle}</p>
              </div>
            ))}
          </section>
        )}

        {upcomingEvents.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal" />
              <h2 className="text-sm font-semibold text-deepSage">Your Upcoming Events</h2>
            </div>
            {upcomingEvents.map(e => (
              <div key={e.eventId} className="bg-white border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-medium text-deepSage">{e.eventName}</p>
                <p className="text-xs text-textSecondaryLight">{e.programTitle}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-textSecondaryLight">
                  {e.dayOfWeek && <span>{e.dayOfWeek}</span>}
                  {e.startTime && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime12(e.startTime)} – {formatTime12(e.endTime)}
                    </span>
                  )}
                  {e.locationName && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {e.locationName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function formatTime12(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}
