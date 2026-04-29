import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  EyeOff,
  Heart,
  MapPin,
  MessageSquare,
  Users,
  Info,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Building2,
  TrendingUp,
  Activity,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import api from '@/lib/api';

interface PrivacySettings {
  parentCanSeeMood: boolean;
  parentCanSeeDemographics: boolean;
  parentCanSeeAttendance: boolean;
  parentCanSeeXimiChats: boolean;
  hiddenProgramIds: string[];
  lastReviewedAt: string | null;
}

interface SavedProgram {
  id: string;
  title: string;
  organizer: string;
}

interface WorkerRequest {
  id: string;
  consentStatus: 'pending' | 'granted' | 'denied' | 'revoked';
  consentLevel: {
    share_mood_timeline?: boolean;
    share_program_engagement?: boolean;
    share_checkin_streak?: boolean;
  };
  requestedAt: string;
  respondedAt: string | null;
  workerFirstName: string | null;
  workerLastName: string | null;
  organizationName: string;
}

interface WorkerRequests {
  pending: WorkerRequest[];
  granted: WorkerRequest[];
  denied: WorkerRequest[];
  revoked: WorkerRequest[];
}

const PRIVACY_TOGGLES = [
  {
    key: 'parentCanSeeMood',
    title: 'Mood Check-ins',
    description: 'Allow your parent/guardian to see your daily mood scores and trends',
    icon: Heart,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    defaultOn: true,
    sensitive: false
  },
  {
    key: 'parentCanSeeAttendance',
    title: 'Program Attendance',
    description: 'Allow your parent/guardian to see which programs you attend',
    icon: MapPin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    defaultOn: true,
    sensitive: false
  },
  {
    key: 'parentCanSeeDemographics',
    title: 'Identity & Demographics',
    description: 'Allow your parent/guardian to see your self-reported identity information (orientation, gender, etc.)',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    defaultOn: false,
    sensitive: true
  },
  {
    key: 'parentCanSeeXimiChats',
    title: 'Ximi Conversations',
    description: 'Allow your parent/guardian to see your conversations with Ximi (AI Program Finder)',
    icon: MessageSquare,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    defaultOn: false,
    sensitive: true
  }
] as const;

const WORKER_CONSENT_TOGGLES = [
  {
    key: 'share_mood_timeline',
    title: 'Mood Timeline',
    description: 'Allow them to see your daily mood check-ins and trends',
    icon: TrendingUp,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    key: 'share_program_engagement',
    title: 'Program Attendance',
    description: 'Allow them to see which programs you attend',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'share_checkin_streak',
    title: 'Check-in Streak',
    description: 'Allow them to see your check-in streak and consistency',
    icon: Activity,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
];

export default function YouthPrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>({
    parentCanSeeMood: true,
    parentCanSeeDemographics: false,
    parentCanSeeAttendance: true,
    parentCanSeeXimiChats: false,
    hiddenProgramIds: [],
    lastReviewedAt: null
  });
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  const [workerRequests, setWorkerRequests] = useState<WorkerRequests>({
    pending: [],
    granted: [],
    denied: [],
    revoked: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showProgramList, setShowProgramList] = useState(false);
  const [showWorkerSection, setShowWorkerSection] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasGuardianConsent, setHasGuardianConsent] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const [privacyRes, programsRes, guardianRes, workerRes] = await Promise.all([
        api.privacy.getYouthSettings(),
        api.programs.getSaved(),
        api.consent.guardianStatus(),
        api.privacy.getWorkerRequests()
      ]);

      if (privacyRes.data) {
        setSettings(privacyRes.data);
      }
      if (programsRes.data) {
        setSavedPrograms(programsRes.data);
      }
      if (guardianRes.data) {
        setHasGuardianConsent(guardianRes.data.status === 'verified');
      }
      if (workerRes.data) {
        setWorkerRequests(workerRes.data);
      }
    } catch (err) {
      console.error('Error loading privacy settings:', err);
      setError('Failed to load your privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerResponse = async (requestId: string, action: 'grant' | 'deny' | 'revoke', consentLevel?: WorkerRequest['consentLevel']) => {
    setSaving(`worker-${requestId}`);
    setError(null);

    try {
      const defaultConsent = {
        share_mood_timeline: true,
        share_program_engagement: true,
        share_checkin_streak: true,
      };

      const { error: apiError } = await api.privacy.respondToWorkerRequest(
        requestId,
        action,
        action === 'grant' ? (consentLevel || defaultConsent) : undefined
      );

      if (apiError) {
        throw new Error(apiError);
      }

      await loadSettings();
    } catch (err) {
      console.error('Error responding to worker request:', err);
      setError('Failed to update worker access. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleWorkerConsentToggle = async (requestId: string, key: string, currentLevel: WorkerRequest['consentLevel']) => {
    setSaving(`worker-toggle-${requestId}-${key}`);
    setError(null);

    try {
      const newLevel = {
        ...currentLevel,
        [key]: !currentLevel[key as keyof typeof currentLevel],
      };

      const { error: apiError } = await api.privacy.updateWorkerConsentLevel(requestId, newLevel);

      if (apiError) {
        throw new Error(apiError);
      }

      await loadSettings();
    } catch (err) {
      console.error('Error updating worker consent:', err);
      setError('Failed to update permission. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (key: keyof Omit<PrivacySettings, 'hiddenProgramIds' | 'lastReviewedAt'>) => {
    const newValue = !settings[key];
    setSaving(key);
    setError(null);

    try {
      const { error: apiError } = await api.privacy.updateYouthSettings({
        [key]: newValue
      });

      if (apiError) {
        throw new Error(apiError);
      }

      setSettings(prev => ({
        ...prev,
        [key]: newValue
      }));
    } catch (err) {
      console.error('Error updating setting:', err);
      setError('Failed to update setting. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleProgramVisibility = async (programId: string) => {
    const isCurrentlyHidden = settings.hiddenProgramIds.includes(programId);
    const newHiddenIds = isCurrentlyHidden
      ? settings.hiddenProgramIds.filter(id => id !== programId)
      : [...settings.hiddenProgramIds, programId];

    setSaving(`program-${programId}`);
    setError(null);

    try {
      const { error: apiError } = await api.privacy.updateYouthSettings({
        hiddenProgramIds: newHiddenIds
      });

      if (apiError) {
        throw new Error(apiError);
      }

      setSettings(prev => ({
        ...prev,
        hiddenProgramIds: newHiddenIds
      }));
    } catch (err) {
      console.error('Error updating program visibility:', err);
      setError('Failed to update program visibility. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Loading privacy settings...</span>
      </div>
    );
  }

  if (!hasGuardianConsent) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-gray-900">Parent Privacy Settings</h3>
            <p className="text-sm text-gray-600 mt-1">
              These settings become available after a parent/guardian provides consent.
              You'll be able to control what they can see in their Parent Portal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-purple-900">Your Privacy, Your Control</h3>
            <p className="text-sm text-purple-700 mt-1">
              You decide what your parent/guardian can see in their Parent Portal.
              Sensitive information like identity and private conversations are hidden by default.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700"
        >
          <X className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </motion.div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          What Parents Can See
        </h4>
        
        {PRIVACY_TOGGLES.map(toggle => {
          const Icon = toggle.icon;
          const isEnabled = settings[toggle.key as keyof PrivacySettings] as boolean;
          const isSaving = saving === toggle.key;

          return (
            <motion.div
              key={toggle.key}
              className={`relative overflow-hidden rounded-xl border-2 transition-colors ${
                isEnabled ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
              }`}
              whileTap={{ scale: 0.995 }}
            >
              <button
                onClick={() => handleToggle(toggle.key as keyof Omit<PrivacySettings, 'hiddenProgramIds' | 'lastReviewedAt'>)}
                disabled={isSaving}
                className="w-full p-4 flex items-center gap-4 text-left"
              >
                <div className={`p-2 rounded-lg ${toggle.bgColor}`}>
                  <Icon className={`w-5 h-5 ${toggle.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{toggle.title}</span>
                    {toggle.sensitive && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Sensitive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{toggle.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : isEnabled ? (
                    <div className="flex items-center gap-1.5 text-green-600">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">Visible</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <EyeOff className="w-4 h-4" />
                      <span className="text-sm font-medium">Hidden</span>
                    </div>
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Youth Worker Access Section */}
      <div className="space-y-3">
        <button
          onClick={() => setShowWorkerSection(!showWorkerSection)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal" />
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              Youth Worker Access
            </h4>
            {(workerRequests.pending.length > 0 || workerRequests.granted.length > 0) && (
              <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full">
                {workerRequests.pending.length + workerRequests.granted.length}
              </span>
            )}
          </div>
          {showWorkerSection ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {showWorkerSection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <p className="text-sm text-gray-600">
              Youth workers from partner organizations can request access to support you better.
              You control exactly what they can see. Their organization sees only anonymized summaries.
            </p>

            {/* Pending Requests */}
            {workerRequests.pending.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">Pending Requests</span>
                </div>
                {workerRequests.pending.map(request => (
                  <motion.div
                    key={request.id}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Building2 className="w-5 h-5 text-amber-700" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.workerFirstName} {request.workerLastName}
                          </p>
                          <p className="text-sm text-gray-600">{request.organizationName}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleWorkerResponse(request.id, 'grant')}
                        disabled={saving === `worker-${request.id}`}
                        className="flex-1 py-2 px-4 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving === `worker-${request.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Grant Access
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleWorkerResponse(request.id, 'deny')}
                        disabled={saving === `worker-${request.id}`}
                        className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Granted Access */}
            {workerRequests.granted.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal" />
                  <span className="text-sm font-medium text-teal">Active Access</span>
                </div>
                {workerRequests.granted.map(request => (
                  <motion.div
                    key={request.id}
                    className="bg-white border border-teal/20 rounded-xl p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal/10 rounded-lg">
                          <Building2 className="w-5 h-5 text-teal" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.workerFirstName} {request.workerLastName}
                          </p>
                          <p className="text-sm text-gray-600">{request.organizationName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleWorkerResponse(request.id, 'revoke')}
                        disabled={saving?.startsWith(`worker-${request.id}`)}
                        className="text-sm text-coralText hover:text-coral/80 font-medium"
                      >
                        Revoke
                      </button>
                    </div>

                    {/* Consent Level Toggles */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">What they can see:</p>
                      {WORKER_CONSENT_TOGGLES.map(toggle => {
                        const Icon = toggle.icon;
                        const isEnabled = request.consentLevel?.[toggle.key as keyof typeof request.consentLevel] !== false;
                        const isSaving = saving === `worker-toggle-${request.id}-${toggle.key}`;

                        return (
                          <button
                            key={toggle.key}
                            onClick={() => handleWorkerConsentToggle(request.id, toggle.key, request.consentLevel)}
                            disabled={isSaving}
                            className={`w-full p-3 flex items-center gap-3 rounded-lg border transition-colors ${
                              isEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className={`p-1.5 rounded ${toggle.bgColor}`}>
                              <Icon className={`w-4 h-4 ${toggle.color}`} />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-gray-900">{toggle.title}</p>
                            </div>
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : isEnabled ? (
                              <Eye className="w-4 h-4 text-green-600" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {workerRequests.pending.length === 0 && workerRequests.granted.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No youth workers have requested access yet.
              </div>
            )}

            {/* Organization Note */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  <strong>About Organizations:</strong> When you grant a youth worker access,
                  their organization only sees anonymous, aggregated summaries (like "5 youth attended this week")
                  – never your individual data. Your privacy is protected.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {savedPrograms.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowProgramList(!showProgramList)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              Hide Specific Programs
            </h4>
            {showProgramList ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showProgramList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <p className="text-sm text-gray-600">
                You can hide your attendance at specific programs. This is helpful for support groups
                or sensitive programs you'd prefer to keep private.
              </p>
              
              {savedPrograms.map(program => {
                const isHidden = settings.hiddenProgramIds.includes(program.id);
                const isSaving = saving === `program-${program.id}`;

                return (
                  <motion.div
                    key={program.id}
                    className={`rounded-lg border p-3 flex items-center justify-between ${
                      isHidden ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{program.title}</p>
                      <p className="text-sm text-gray-500">{program.organizer}</p>
                    </div>

                    <button
                      onClick={() => handleToggleProgramVisibility(program.id)}
                      disabled={isSaving}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isHidden
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isHidden ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Hidden
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Visible
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      )}

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900">Your Safety is Important</h4>
            <p className="text-sm text-blue-700 mt-1">
              Even with these privacy controls, if you're in crisis, we'll still show you resources
              to get help. We don't automatically notify your parents about crisis moments –
              that's between you and trusted adults you choose to reach out to.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
