import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, QrCode, UserCheck, Loader, MapPin } from 'lucide-react';
import useFocusTrap from '@/hooks/useFocusTrap';

interface AttendanceRecord {
  id: string;
  programId: string;
  method: string;
  site: string | null;
  createdAt: string;
  programs?: {
    title: string;
    organizer?: string;
  };
}

interface AttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AttendanceHistoryModal({ isOpen, onClose }: AttendanceHistoryModalProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const focusTrapRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (isOpen) {
      loadAttendance();
    }
  }, [isOpen]);

  async function loadAttendance() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/xid/attendance?limit=100', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load attendance history');
      }

      const data = await response.json();
      setAttendance(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Group attendance by month
  const groupedAttendance = attendance.reduce((groups, record) => {
    const date = new Date(record.createdAt);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(record);
    return groups;
  }, {} as Record<string, AttendanceRecord[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            ref={focusTrapRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-surface rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-borderMutedLight">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <h2 id="attendance-modal-title" className="text-lg font-semibold text-deepSage">Attendance History</h2>
                  <p className="text-sm text-textSecondaryLight">
                    {attendance.length} total check-ins
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-textSecondaryLight" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-teal animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-coralText mb-4">{error}</p>
                  <button
                    onClick={loadAttendance}
                    className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : attendance.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-textSecondaryLight">No attendance records yet</p>
                  <p className="text-sm text-textSecondaryLight mt-1">
                    Scan a QR code at a program to check in
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedAttendance).map(([monthYear, records]) => (
                    <div key={monthYear}>
                      <h3 className="text-sm font-medium text-textSecondaryLight mb-3 sticky top-0 bg-surface py-1">
                        {monthYear}
                      </h3>
                      <div className="space-y-3">
                        {records.map((record, index) => (
                          <motion.div
                            key={record.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.3 }}
                            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-borderMutedLight/50"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              record.method === 'qr' 
                                ? 'bg-teal/10 text-teal' 
                                : 'bg-gold/10 text-gold'
                            }`}>
                              {record.method === 'qr' ? (
                                <QrCode className="w-5 h-5" />
                              ) : (
                                <UserCheck className="w-5 h-5" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-deepSage truncate">
                                {record.programs?.title || 'Unknown Program'}
                              </div>
                              {record.programs?.organizer && (
                                <div className="text-sm text-textSecondaryLight truncate">
                                  {record.programs.organizer}
                                </div>
                              )}
                              {record.site && (
                                <div className="flex items-center gap-1 text-xs text-textSecondaryLight mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {record.site}
                                </div>
                              )}
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-medium text-deepSage">
                                {formatDate(record.createdAt)}
                              </div>
                              <div className="text-xs text-textSecondaryLight">
                                {formatTime(record.createdAt)}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AttendanceHistoryModal;
