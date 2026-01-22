import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  LogOut, 
  Loader, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  AlertCircle,
  Shield
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConsentStatusBadge } from '@/components/ConsentStatusBadge';

interface ConsentLevel {
  share_mood_timeline?: boolean;
  share_program_engagement?: boolean;
  share_checkin_streak?: boolean;
}

interface AssignedYouth {
  id: string;
  youthId: string;
  consentStatus: 'granted' | 'pending' | 'denied' | 'revoked';
  consentLevel: ConsentLevel;
  requestedAt: string;
  respondedAt: string | null;
  profile?: {
    displayName: string;
  };
}

interface WorkerSession {
  youthWorkerId: string;
  organizationId: string;
  role: string;
}

export default function YouthWorkerDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [grantedYouth, setGrantedYouth] = useState<AssignedYouth[]>([]);
  const [pendingYouth, setPendingYouth] = useState<AssignedYouth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [youthEmail, setYouthEmail] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (session) {
      loadAssignedYouth();
    }
  }, [session]);

  async function checkSession() {
    try {
      const response = await fetch('/api/youth-workers/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        navigate('/youth-worker/login');
        return;
      }

      const data = await response.json();
      setSession(data);
    } catch (err) {
      navigate('/youth-worker/login');
    }
  }

  async function loadAssignedYouth() {
    try {
      setLoading(true);
      const response = await fetch('/api/youth-workers/my-youth', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load assigned youth');
      }

      const data = await response.json();
      setGrantedYouth(data.granted || []);
      setPendingYouth(data.pending || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/youth-workers/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/youth-worker/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  async function handleRequestAssignment(e: React.FormEvent) {
    e.preventDefault();
    setAssignError(null);
    setAssignSuccess(false);
    setAssignLoading(true);

    try {
      const response = await fetch('/api/youth-workers/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ youthEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request assignment');
      }

      setAssignSuccess(true);
      setYouthEmail('');
      loadAssignedYouth();
      
      setTimeout(() => {
        setShowAssignForm(false);
        setAssignSuccess(false);
      }, 2000);
    } catch (err: any) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  }

  if (loading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-teal" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-deepSage">
                Youth Worker Dashboard
              </h1>
              <p className="text-sm text-textSecondaryLight">
                {session?.role || 'Worker'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-textSecondaryLight hover:text-coral transition-colors rounded-lg hover:bg-coral/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-coral/10 border border-coral/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-coral font-medium">Error loading data</p>
              <p className="text-sm text-coral/80">{error}</p>
            </div>
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-teal" />
              <h2 className="text-lg font-display font-semibold text-deepSage">
                Assigned Youth ({grantedYouth.length})
              </h2>
            </div>
            <button
              onClick={() => setShowAssignForm(!showAssignForm)}
              className="flex items-center gap-2 px-3 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Request Assignment
            </button>
          </div>

          {showAssignForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-gray-100 p-4 mb-4"
            >
              <h3 className="font-medium text-deepSage mb-3">Request Assignment to New Youth</h3>
              <form onSubmit={handleRequestAssignment} className="space-y-3">
                {assignError && (
                  <div className="bg-coral/10 border border-coral/30 rounded-lg p-3 text-sm text-coral">
                    {assignError}
                  </div>
                )}
                {assignSuccess && (
                  <div className="bg-teal/10 border border-teal/30 rounded-lg p-3 text-sm text-teal">
                    Assignment request sent successfully! Waiting for youth consent.
                  </div>
                )}
                <div>
                  <label htmlFor="youthEmail" className="block text-sm font-medium text-deepSage mb-1">
                    Youth Email
                  </label>
                  <input
                    id="youthEmail"
                    type="email"
                    value={youthEmail}
                    onChange={(e) => setYouthEmail(e.target.value)}
                    required
                    placeholder="youth@example.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={assignLoading}
                    className="flex-1 py-2 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {assignLoading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      'Send Request'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignForm(false);
                      setAssignError(null);
                    }}
                    className="px-4 py-2 text-textSecondaryLight hover:text-deepSage transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 text-teal animate-spin" />
            </div>
          ) : grantedYouth.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-textSecondaryLight">
                No youth with granted consent yet.
              </p>
              <p className="text-sm text-textSecondaryLight mt-1">
                Request assignment to a youth to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {grantedYouth.map((youth) => (
                <Link
                  key={youth.id}
                  to={`/youth-worker/youth/${youth.youthId}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-teal/30 hover:shadow-soft transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-teal" />
                        </div>
                        <div>
                          <h3 className="font-medium text-deepSage">
                            {youth.profile?.displayName || 'Youth'}
                          </h3>
                          <p className="text-xs text-textSecondaryLight">
                            Assigned {new Date(youth.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <ConsentStatusBadge 
                        consentLevel={youth.consentLevel} 
                        consentStatus={youth.consentStatus}
                        showDetails
                      />
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {pendingYouth.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-display font-semibold text-deepSage">
                Pending Consent ({pendingYouth.length})
              </h2>
            </div>

            <div className="space-y-3">
              {pendingYouth.map((youth) => (
                <div
                  key={youth.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-deepSage">
                          Pending Youth
                        </h3>
                        <p className="text-xs text-textSecondaryLight">
                          Requested {new Date(youth.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ConsentStatusBadge consentStatus="pending" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
