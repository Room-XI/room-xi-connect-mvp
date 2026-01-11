import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Shield, 
  LogOut, 
  Loader, 
  Heart, 
  EyeOff, 
  Calendar, 
  MapPin,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  Bell,
  Phone,
  Download,
  Trash2,
  Plus,
  Edit2,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  UserPlus,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import ParentConsentManager from '@/components/ParentConsentManager';

interface PrivacySettings {
  moodVisible: boolean;
  attendanceVisible: boolean;
  demographicsVisible: boolean;
  ximiChatsVisible: boolean;
}

interface MoodData {
  recentCheckins: Array<{
    date: string;
    moodLevel: number;
    moodType: string | null;
  }>;
  totalCheckins: number;
  averageMood: number | null;
  currentMood: string | null;
  streakCount: number;
  lastCheckinDate: string | null;
}

interface AttendanceRecord {
  programId: string;
  programTitle: string;
  organizer: string | null;
  timestamp: string;
  method: string;
}

interface AttendanceData {
  records: AttendanceRecord[];
  totalAttendance: number;
  hiddenProgramCount: number;
}

interface YouthProfile {
  firstName: string | null;
  preferredName: string | null;
  age: number | null;
  city: string | null;
}

interface YouthData {
  youthId: string;
  relation: string;
  verifiedAt: string;
  profile: YouthProfile;
  privacySettings: PrivacySettings;
  moodData: MoodData | null;
  attendanceData: AttendanceData | null;
  demographicsData: any | null;
  hiddenCategories: string[];
  coGuardians?: Array<{ name: string; role: string }>;
}

interface LinkedYouth {
  userId: string;
  relation: string;
  guardianRole?: string;
  verifiedAt: string | null;
  preferredName: string | null;
  firstName: string | null;
  age: number | null;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  email?: string;
  isPrimary?: boolean;
  notes?: string;
}

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'attention';
  youthId: string;
  youthName: string;
  message: string;
  createdAt: string;
}

interface ConsentHistoryItem {
  id: string;
  eventType: string;
  eventData: any;
  occurredAt: string;
}

type TabType = 'overview' | 'consent' | 'contacts' | 'data' | 'alerts';

const MOOD_LABELS: Record<string, string> = {
  cold: 'Low Energy',
  stormy: 'Challenging',
  foggy: 'Uncertain',
  clear: 'Balanced',
  breezy: 'Positive',
  aurora: 'Thriving'
};

const TABS: { id: TabType; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'overview', label: 'Overview', icon: Heart },
  { id: 'consent', label: 'Consent', icon: Shield },
  { id: 'contacts', label: 'Contacts', icon: Phone },
  { id: 'data', label: 'Data', icon: FileText },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

export default function ParentPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linkedYouth, setLinkedYouth] = useState<LinkedYouth[]>([]);
  const [selectedYouth, setSelectedYouth] = useState<string | null>(null);
  const [youthData, setYouthData] = useState<YouthData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mood: true,
    attendance: true,
    privacy: true
  });

  const [privacySummary, setPrivacySummary] = useState<any>(null);
  const [consentHistory, setConsentHistory] = useState<ConsentHistoryItem[]>([]);
  const [loadingConsent, setLoadingConsent] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relationship: '', email: '', isPrimary: false, notes: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingData, setDeletingData] = useState(false);

  useEffect(() => {
    loadParentStatus();
  }, []);

  useEffect(() => {
    if (selectedYouth) {
      loadYouthData(selectedYouth);
    }
  }, [selectedYouth]);

  useEffect(() => {
    if (selectedYouth && activeTab === 'consent') {
      loadConsentData(selectedYouth);
    } else if (selectedYouth && activeTab === 'contacts') {
      loadEmergencyContacts(selectedYouth);
    } else if (activeTab === 'alerts') {
      loadAlerts();
    }
  }, [selectedYouth, activeTab]);

  const loadParentStatus = async () => {
    try {
      setLoading(true);
      const { data, error: apiError } = await api.parentAuth.getStatus();

      if (apiError) {
        throw new Error(apiError);
      }

      if (data?.linkedYouth) {
        setLinkedYouth(data.linkedYouth);
        if (data.linkedYouth.length > 0) {
          setSelectedYouth(data.linkedYouth[0].userId);
        }
      }
    } catch (err: any) {
      console.error('Failed to load parent status:', err);
      setError(err.message || 'Failed to load youth information');
      
      if (err.message?.includes('401') || err.message?.includes('authentication')) {
        navigate('/parent/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadYouthData = async (youthId: string) => {
    try {
      setLoadingData(true);
      const { data, error: apiError } = await api.parentPortal.getYouthData(youthId);

      if (apiError) {
        throw new Error(apiError);
      }

      if (data) {
        setYouthData(data);
      }
    } catch (err: any) {
      console.error('Failed to load youth data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadConsentData = async (youthId: string) => {
    try {
      setLoadingConsent(true);
      const [summaryRes, historyRes] = await Promise.all([
        api.parentPortal.getPrivacySummary(youthId),
        api.parentPortal.getConsentHistory(youthId),
      ]);

      if (summaryRes.data) {
        setPrivacySummary(summaryRes.data);
      }
      if (historyRes.data?.history) {
        setConsentHistory(historyRes.data.history);
      }
    } catch (err: any) {
      console.error('Failed to load consent data:', err);
    } finally {
      setLoadingConsent(false);
    }
  };

  const loadEmergencyContacts = async (youthId: string) => {
    try {
      setLoadingContacts(true);
      const { data, error: apiError } = await api.parentPortal.getEmergencyContacts(youthId);

      if (data?.contacts) {
        setEmergencyContacts(data.contacts);
      }
    } catch (err: any) {
      console.error('Failed to load emergency contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const { data, error: apiError } = await api.parentPortal.getAlerts();

      if (data?.alerts) {
        setAlerts(data.alerts);
      }
    } catch (err: any) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.parentAuth.logout();
      navigate('/parent/login');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleWithdrawConsent = async () => {
    if (!selectedYouth) return;
    
    try {
      setWithdrawing(true);
      const { data, error: apiError } = await api.parentPortal.withdrawConsent(selectedYouth, withdrawReason);
      
      if (apiError) {
        throw new Error(apiError);
      }
      
      setShowWithdrawConfirm(false);
      setWithdrawReason('');
      loadConsentData(selectedYouth);
    } catch (err: any) {
      console.error('Failed to withdraw consent:', err);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSaveContact = async () => {
    if (!selectedYouth || !contactForm.name || !contactForm.phone || !contactForm.relationship) return;
    
    try {
      setSavingContact(true);
      
      if (editingContact) {
        await api.parentPortal.updateEmergencyContact(editingContact.id, contactForm);
      } else {
        await api.parentPortal.addEmergencyContact(selectedYouth, contactForm);
      }
      
      setShowContactForm(false);
      setEditingContact(null);
      setContactForm({ name: '', phone: '', relationship: '', email: '', isPrimary: false, notes: '' });
      loadEmergencyContacts(selectedYouth);
    } catch (err: any) {
      console.error('Failed to save contact:', err);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId || !selectedYouth) return;
    
    try {
      await api.parentPortal.deleteEmergencyContact(deleteContactId);
      setDeleteContactId(null);
      loadEmergencyContacts(selectedYouth);
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleExportData = async () => {
    if (!selectedYouth) return;
    await api.parentPortal.exportData(selectedYouth);
  };

  const handleDeleteData = async () => {
    if (!selectedYouth) return;
    
    try {
      setDeletingData(true);
      const { data, error: apiError } = await api.parentPortal.requestDataDeletion(selectedYouth, deleteReason);
      
      if (apiError) {
        throw new Error(apiError);
      }
      
      setShowDeleteConfirm(false);
      setDeleteReason('');
      alert(data?.message || 'Deletion request submitted successfully.');
    } catch (err: any) {
      console.error('Failed to request data deletion:', err);
    } finally {
      setDeletingData(false);
    }
  };

  const openEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      email: contact.email || '',
      isPrimary: contact.isPrimary || false,
      notes: contact.notes || '',
    });
    setShowContactForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-teal" />
      </div>
    );
  }

  if (error || linkedYouth.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cosmic-card p-8 max-w-md text-center space-y-4"
        >
          <Shield className="w-12 h-12 text-coral mx-auto" />
          <h2 className="text-2xl font-display font-bold text-deepSage">
            No Linked Youth
          </h2>
          <p className="text-textSecondaryLight">
            {error || 'You do not have any linked youth accounts. Please accept an invitation from a youth to get started.'}
          </p>
          <button
            onClick={() => navigate('/parent/login')}
            className="w-full px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  const selectedYouthBasic = linkedYouth.find((y) => y.userId === selectedYouth);
  const youthName = youthData?.profile?.preferredName || youthData?.profile?.firstName || selectedYouthBasic?.preferredName || selectedYouthBasic?.firstName || 'Youth';
  const alertCount = alerts.length;

  return (
    <div className="min-h-screen bg-gradient-cosmic">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-teal/10 rounded-lg">
                <Shield className="w-6 h-6 text-teal" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-deepSage">
                  Parent Portal
                </h1>
                <p className="text-sm text-textSecondaryLight">
                  View your youth's shared data and manage consent
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-coral/10 text-coral rounded-lg hover:bg-coral/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </motion.div>

        {linkedYouth.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="cosmic-card p-4 mb-6"
          >
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-4 h-4 text-teal" />
              <span className="text-sm font-medium text-deepSage">Select Youth</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {linkedYouth.map((youth) => (
                <button
                  key={youth.userId}
                  onClick={() => setSelectedYouth(youth.userId)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedYouth === youth.userId
                      ? 'bg-teal text-white'
                      : 'bg-sage/10 text-deepSage hover:bg-sage/20'
                  }`}
                >
                  {youth.preferredName || youth.firstName || 'Youth'}
                  {youth.age && ` (${youth.age})`}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {selectedYouthBasic && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="cosmic-card p-6 mb-6"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gold/10 rounded-lg">
                <Heart className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-deepSage">{youthName}</h2>
                <p className="text-sm text-textSecondaryLight">
                  {selectedYouthBasic.relation === 'guardian' ? 'Guardian' : 'Parent'} 
                  {selectedYouthBasic.guardianRole && ` (${selectedYouthBasic.guardianRole})`} •
                  Linked {selectedYouthBasic.verifiedAt && new Date(selectedYouthBasic.verifiedAt).toLocaleDateString()}
                </p>
                {youthData?.coGuardians && youthData.coGuardians.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-teal/70" />
                    <span className="text-xs text-textSecondaryLight">
                      Co-guardians: {youthData.coGuardians.map(g => g.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="cosmic-card p-2 mb-6"
        >
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === 'alerts' && alertCount > 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
                    isActive
                      ? 'bg-teal text-white'
                      : 'text-textSecondaryLight hover:bg-sage/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 bg-coral text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-teal" />
            <span className="ml-2 text-textSecondaryLight">Loading data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && youthData && (
              <>
                {youthData.hiddenCategories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
                  >
                    <div className="flex items-start gap-3">
                      <EyeOff className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-amber-900">Some Information is Private</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          {youthName} has chosen to keep some information private. This is their right under our privacy-first approach.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {youthData.hiddenCategories.includes('mood') && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              Mood Data Hidden
                            </span>
                          )}
                          {youthData.hiddenCategories.includes('attendance') && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              Attendance Hidden
                            </span>
                          )}
                          {youthData.hiddenCategories.includes('demographics') && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              Demographics Hidden
                            </span>
                          )}
                          {youthData.hiddenCategories.includes('ximiChats') && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              AI Conversations Hidden
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {youthData.moodData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="cosmic-card mb-6 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleSection('mood')}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-sage/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-50 rounded-lg">
                          <Heart className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-deepSage">Mood & Wellness</h3>
                          <p className="text-sm text-textSecondaryLight">
                            {youthData.moodData.totalCheckins} check-ins • {youthData.moodData.streakCount} day streak
                          </p>
                        </div>
                      </div>
                      {expandedSections.mood ? (
                        <ChevronUp className="w-5 h-5 text-textSecondaryLight" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-textSecondaryLight" />
                      )}
                    </button>

                    {expandedSections.mood && (
                      <div className="px-4 pb-4 border-t border-sage/10">
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="bg-sage/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-teal" />
                              <span className="text-sm font-medium text-deepSage">Average Mood</span>
                            </div>
                            <p className="text-2xl font-bold text-teal">
                              {youthData.moodData.averageMood?.toFixed(1) || '--'}/6
                            </p>
                          </div>
                          <div className="bg-sage/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-teal" />
                              <span className="text-sm font-medium text-deepSage">Current Mood</span>
                            </div>
                            <p className="text-lg font-semibold text-deepSage">
                              {youthData.moodData.currentMood 
                                ? MOOD_LABELS[youthData.moodData.currentMood] || youthData.moodData.currentMood
                                : 'Not set'}
                            </p>
                          </div>
                        </div>

                        {youthData.moodData.recentCheckins.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-textSecondaryLight mb-2">Recent Check-ins</h4>
                            <div className="space-y-2">
                              {youthData.moodData.recentCheckins.slice(0, 7).map((checkin, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2 border-b border-sage/10 last:border-0">
                                  <span className="text-sm text-textSecondaryLight">
                                    {new Date(checkin.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-deepSage">
                                      {checkin.moodType ? MOOD_LABELS[checkin.moodType] || checkin.moodType : `Level ${checkin.moodLevel}`}
                                    </span>
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ 
                                        backgroundColor: `hsl(${(checkin.moodLevel / 6) * 120}, 70%, 50%)`
                                      }} 
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {youthData.attendanceData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="cosmic-card mb-6 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleSection('attendance')}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-sage/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-deepSage">Program Attendance</h3>
                          <p className="text-sm text-textSecondaryLight">
                            {youthData.attendanceData.totalAttendance} program visits
                            {youthData.attendanceData.hiddenProgramCount > 0 && (
                              <span className="text-amber-600"> • {youthData.attendanceData.hiddenProgramCount} hidden</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {expandedSections.attendance ? (
                        <ChevronUp className="w-5 h-5 text-textSecondaryLight" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-textSecondaryLight" />
                      )}
                    </button>

                    {expandedSections.attendance && (
                      <div className="px-4 pb-4 border-t border-sage/10">
                        {youthData.attendanceData.records.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {youthData.attendanceData.records.slice(0, 10).map((record, idx) => (
                              <div key={idx} className="flex items-center justify-between py-2 border-b border-sage/10 last:border-0">
                                <div>
                                  <p className="font-medium text-deepSage">{record.programTitle || 'Unknown Program'}</p>
                                  <p className="text-sm text-textSecondaryLight">{record.organizer || 'Unknown organizer'}</p>
                                </div>
                                <span className="text-sm text-textSecondaryLight">
                                  {new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 text-center py-6 text-textSecondaryLight">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No program attendance recorded yet</p>
                          </div>
                        )}

                        {youthData.attendanceData.hiddenProgramCount > 0 && (
                          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-amber-700 text-sm">
                              <EyeOff className="w-4 h-4" />
                              <span>{youthName} has hidden {youthData.attendanceData.hiddenProgramCount} program(s) from this view</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {!youthData.privacySettings.moodVisible && !youthData.privacySettings.attendanceVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="cosmic-card p-6 mb-6 text-center"
                  >
                    <EyeOff className="w-12 h-12 text-textSecondaryLight mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-deepSage mb-2">Data is Private</h3>
                    <p className="text-textSecondaryLight">
                      {youthName} has chosen to keep their data private at this time.
                      This is their right under our privacy-first approach.
                    </p>
                  </motion.div>
                )}

                {selectedYouth && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <ParentConsentManager userId={selectedYouth} youthName={youthName} />
                  </motion.div>
                )}
              </>
            )}

            {activeTab === 'consent' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {loadingConsent ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-6 h-6 animate-spin text-teal" />
                    <span className="ml-2 text-textSecondaryLight">Loading consent information...</span>
                  </div>
                ) : (
                  <>
                    <div className="cosmic-card p-6 mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-teal" />
                        <h3 className="text-lg font-semibold text-deepSage">Privacy Summary</h3>
                      </div>
                      
                      {privacySummary && (
                        <>
                          <p className="text-textSecondaryLight mb-4">{privacySummary.message}</p>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-sage/10">
                              <span className="text-sm text-deepSage">Mood Data</span>
                              <span className={`text-sm font-medium ${privacySummary.privacySettings.moodVisible ? 'text-green-600' : 'text-amber-600'}`}>
                                {privacySummary.privacySettings.moodVisible ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-sage/10">
                              <span className="text-sm text-deepSage">Attendance</span>
                              <span className={`text-sm font-medium ${privacySummary.privacySettings.attendanceVisible ? 'text-green-600' : 'text-amber-600'}`}>
                                {privacySummary.privacySettings.attendanceVisible ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-sage/10">
                              <span className="text-sm text-deepSage">Demographics</span>
                              <span className={`text-sm font-medium ${privacySummary.privacySettings.demographicsVisible ? 'text-green-600' : 'text-amber-600'}`}>
                                {privacySummary.privacySettings.demographicsVisible ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-sage/10">
                              <span className="text-sm text-deepSage">Ximi Conversations</span>
                              <span className={`text-sm font-medium ${privacySummary.privacySettings.ximiChatsVisible ? 'text-green-600' : 'text-amber-600'}`}>
                                {privacySummary.privacySettings.ximiChatsVisible ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                            {privacySummary.privacySettings.hiddenProgramCount > 0 && (
                              <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-deepSage">Hidden Programs</span>
                                <span className="text-sm font-medium text-amber-600">
                                  {privacySummary.privacySettings.hiddenProgramCount} program(s)
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="cosmic-card p-6 mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <History className="w-6 h-6 text-teal" />
                        <h3 className="text-lg font-semibold text-deepSage">Consent History</h3>
                      </div>
                      
                      {consentHistory.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {consentHistory.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 py-2 border-b border-sage/10 last:border-0">
                              <div className="p-1.5 bg-sage/10 rounded">
                                <Clock className="w-4 h-4 text-textSecondaryLight" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-deepSage">
                                  {item.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </p>
                                <p className="text-xs text-textSecondaryLight">
                                  {new Date(item.occurredAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-textSecondaryLight text-center py-4">No consent history available.</p>
                      )}
                    </div>

                    <div className="cosmic-card p-6 border-coral/20 bg-coral/5">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-coral" />
                        <h3 className="text-lg font-semibold text-coral">Withdraw Consent</h3>
                      </div>
                      
                      <p className="text-sm text-textSecondaryLight mb-4">
                        Withdrawing consent will restrict {youthName}'s access to certain features. Their data will remain safe, and you can re-grant consent at any time.
                      </p>
                      
                      <button
                        onClick={() => setShowWithdrawConfirm(true)}
                        className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
                      >
                        Withdraw Consent
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'contacts' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="cosmic-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Phone className="w-6 h-6 text-teal" />
                      <h3 className="text-lg font-semibold text-deepSage">Emergency Contacts</h3>
                    </div>
                    <button
                      onClick={() => {
                        setEditingContact(null);
                        setContactForm({ name: '', phone: '', relationship: '', email: '', isPrimary: false, notes: '' });
                        setShowContactForm(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add Contact</span>
                    </button>
                  </div>
                  
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-6 h-6 animate-spin text-teal" />
                    </div>
                  ) : emergencyContacts.length > 0 ? (
                    <div className="space-y-4">
                      {emergencyContacts.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between p-4 bg-sage/5 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-deepSage">{contact.name}</p>
                              {contact.isPrimary && (
                                <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full">Primary</span>
                              )}
                            </div>
                            <p className="text-sm text-textSecondaryLight">{contact.relationship}</p>
                            <p className="text-sm text-teal">{contact.phone}</p>
                            {contact.email && <p className="text-sm text-textSecondaryLight">{contact.email}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditContact(contact)}
                              className="p-2 text-textSecondaryLight hover:text-teal transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteContactId(contact.id)}
                              className="p-2 text-textSecondaryLight hover:text-coral transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-textSecondaryLight">
                      <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No emergency contacts added yet.</p>
                      <p className="text-sm mt-1">Add contacts who can be reached in case of emergency.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'data' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900">PIPA/PIPEDA Compliance Notice</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Under the Personal Information Protection Act (PIPA) and PIPEDA, you have the right to access, export, and request deletion of your youth's personal data. 
                        Export will download all data as a CSV file. Deletion requests are reviewed and processed within 30 days as required by law.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="cosmic-card p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Download className="w-6 h-6 text-teal" />
                    <h3 className="text-lg font-semibold text-deepSage">Export Data</h3>
                  </div>
                  <p className="text-sm text-textSecondaryLight mb-4">
                    Download all of {youthName}'s data including profile, check-ins, and attendance records as a CSV file.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Data (CSV)</span>
                  </button>
                </div>

                <div className="cosmic-card p-6 border-coral/20 bg-coral/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Trash2 className="w-6 h-6 text-coral" />
                    <h3 className="text-lg font-semibold text-coral">Request Data Deletion</h3>
                  </div>
                  <p className="text-sm text-textSecondaryLight mb-4">
                    Request permanent deletion of all of {youthName}'s data. This action cannot be undone. An administrator will review and process your request within 30 days.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Request Deletion</span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'alerts' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="cosmic-card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-6 h-6 text-teal" />
                    <h3 className="text-lg font-semibold text-deepSage">Alerts & Notifications</h3>
                  </div>
                  
                  {loadingAlerts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-6 h-6 animate-spin text-teal" />
                    </div>
                  ) : alerts.length > 0 ? (
                    <div className="space-y-4">
                      {alerts.map((alert, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-lg border ${
                            alert.severity === 'attention' 
                              ? 'bg-coral/5 border-coral/20' 
                              : alert.severity === 'warning'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {alert.severity === 'attention' ? (
                              <AlertTriangle className="w-5 h-5 text-coral mt-0.5" />
                            ) : alert.severity === 'warning' ? (
                              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            ) : (
                              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className={`font-medium ${
                                alert.severity === 'attention' 
                                  ? 'text-coral' 
                                  : alert.severity === 'warning'
                                  ? 'text-amber-900'
                                  : 'text-blue-900'
                              }`}>
                                {alert.message}
                              </p>
                              <p className="text-xs text-textSecondaryLight mt-1">
                                {new Date(alert.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-textSecondaryLight">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                      <p className="font-medium text-deepSage">All Clear!</p>
                      <p className="text-sm mt-1">No alerts at this time. We'll notify you if anything needs your attention.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Privacy-First Approach</h4>
              <p className="text-sm text-blue-700 mt-1">
                Room XI Connect gives youth control over their privacy. They can choose what to share with you.
                This helps build trust and encourages honest self-reflection.
                If you have concerns about your youth's wellbeing, we encourage open conversations.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-coral" />
              <h3 className="text-lg font-semibold text-deepSage">Confirm Withdrawal</h3>
            </div>
            <p className="text-sm text-textSecondaryLight mb-4">
              Are you sure you want to withdraw consent for {youthName}? This will restrict their access to certain features.
            </p>
            <textarea
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="Reason for withdrawal (optional)"
              className="w-full p-3 border border-sage/30 rounded-lg mb-4 text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawConfirm(false)}
                className="flex-1 px-4 py-2 bg-sage/10 text-deepSage rounded-lg hover:bg-sage/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawConsent}
                disabled={withdrawing}
                className="flex-1 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50"
              >
                {withdrawing ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-deepSage">
                {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
              </h3>
              <button onClick={() => setShowContactForm(false)} className="text-textSecondaryLight hover:text-deepSage">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">Name *</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-sage/30 rounded-lg text-sm"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">Phone *</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-3 border border-sage/30 rounded-lg text-sm"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">Relationship *</label>
                <input
                  type="text"
                  value={contactForm.relationship}
                  onChange={(e) => setContactForm(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full p-3 border border-sage/30 rounded-lg text-sm"
                  placeholder="e.g., Grandmother, Uncle, Family Friend"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 border border-sage/30 rounded-lg text-sm"
                  placeholder="Email address"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={contactForm.isPrimary}
                  onChange={(e) => setContactForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
                  className="w-4 h-4 text-teal"
                />
                <label htmlFor="isPrimary" className="text-sm text-deepSage">Primary contact</label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowContactForm(false)}
                className="flex-1 px-4 py-2 bg-sage/10 text-deepSage rounded-lg hover:bg-sage/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                disabled={savingContact || !contactForm.name || !contactForm.phone || !contactForm.relationship}
                className="flex-1 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50"
              >
                {savingContact ? 'Saving...' : (editingContact ? 'Update' : 'Add Contact')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {deleteContactId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-coral" />
              <h3 className="text-lg font-semibold text-deepSage">Delete Contact</h3>
            </div>
            <p className="text-sm text-textSecondaryLight mb-4">
              Are you sure you want to remove this emergency contact? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteContactId(null)}
                className="flex-1 px-4 py-2 bg-sage/10 text-deepSage rounded-lg hover:bg-sage/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteContact}
                className="flex-1 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-coral" />
              <h3 className="text-lg font-semibold text-deepSage">Request Data Deletion</h3>
            </div>
            <div className="bg-coral/10 border border-coral/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-coral font-medium">⚠️ This action cannot be undone</p>
              <p className="text-xs text-coral/80 mt-1">
                All of {youthName}'s data will be permanently deleted after administrator review.
              </p>
            </div>
            <p className="text-sm text-textSecondaryLight mb-4">
              Please provide a reason for this deletion request:
            </p>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Reason for deletion request"
              className="w-full p-3 border border-sage/30 rounded-lg mb-4 text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-sage/10 text-deepSage rounded-lg hover:bg-sage/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                disabled={deletingData}
                className="flex-1 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50"
              >
                {deletingData ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
