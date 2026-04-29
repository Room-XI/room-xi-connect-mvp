import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  LogOut, 
  Loader, 
  Info,
  ChevronDown,
  ChevronUp,
  Phone,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserPlus,
  History,
  Bell,
  XCircle,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

interface LinkedYouth {
  userId: string;
  relation: string;
  guardianRole?: string;
  verifiedAt: string | null;
  preferredName: string | null;
  firstName: string | null;
  age: number | null;
}

interface ConsentRequest {
  id: string;
  templateId: string;
  youthId: string;
  programId: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  templateName: string;
  templateDescription: string | null;
  templateType: string;
  templateBody: string | null;
  templateVersion: number;
  youthName: string;
}

interface WalletItem {
  receiptId: string;
  requestId: string;
  signedAt: string;
  signature: string;
  templateVersion: number;
  withdrawnAt: string | null;
  templateName: string;
  templateDescription: string | null;
  templateType: string;
  youthId: string;
  programId: string | null;
  requestStatus: string;
  youthName: string;
  isActive: boolean;
}

interface AuditEvent {
  id: string;
  requestId: string;
  actorId: string;
  actorType: string;
  action: string;
  metadata: any;
  occurredAt: string;
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

type TabType = 'action' | 'wallet' | 'contacts' | 'data';

const TYPE_LABELS: Record<string, string> = {
  platform: 'Platform',
  program: 'Program',
  data_sharing: 'Data Sharing',
  photo_media: 'Photo / Media',
  field_trip: 'Field Trip',
  medical: 'Medical',
  custom: 'Other',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock, label: 'Pending' },
  signed: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle, label: 'Signed' },
  declined: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Declined' },
  withdrawn: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: History, label: 'Withdrawn' },
  expired: { color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: Clock, label: 'Expired' },
};

const TABS: { id: TabType; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'action', label: 'Action Needed', icon: Bell },
  { id: 'wallet', label: 'Consent Wallet', icon: Shield },
  { id: 'contacts', label: 'Contacts', icon: Phone },
  { id: 'data', label: 'My Data', icon: FileText },
];

export default function ParentPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linkedYouth, setLinkedYouth] = useState<LinkedYouth[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('action');

  const [pendingRequests, setPendingRequests] = useState<ConsentRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [wallet, setWallet] = useState<WalletItem[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState<string | null>(null);

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditRequestId, setAuditRequestId] = useState<string | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relationship: '', email: '', isPrimary: false, notes: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingData, setDeletingData] = useState(false);

  useEffect(() => {
    loadParentStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'action') {
      loadPendingRequests();
    } else if (activeTab === 'wallet') {
      loadWallet();
    } else if (activeTab === 'contacts' && linkedYouth.length > 0) {
      loadEmergencyContacts(linkedYouth[0].userId);
    }
  }, [activeTab]);

  const loadParentStatus = async () => {
    try {
      setLoading(true);
      const { data } = await api.parentAuth.getStatus();
      if (data?.linkedYouth) {
        setLinkedYouth(data.linkedYouth);
      }
      loadPendingRequests();
    } catch (err: any) {
      console.error('Failed to load parent status:', err);
      setError(err.message || 'Failed to load information');
      if (err.message?.includes('401') || err.message?.includes('authentication')) {
        navigate('/parent/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      setLoadingPending(true);
      const { data } = await api.consentWallet.getRequests('pending');
      if (data?.requests) {
        setPendingRequests(data.requests);
        setPendingCount(data.requests.length);
      }
    } catch (err: any) {
      console.error('Failed to load pending requests:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadWallet = async () => {
    try {
      setLoadingWallet(true);
      const { data } = await api.consentWallet.getWallet();
      if (data?.wallet) {
        setWallet(data.wallet);
      }
    } catch (err: any) {
      console.error('Failed to load wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const loadEmergencyContacts = async (youthId: string) => {
    try {
      setLoadingContacts(true);
      const { data } = await api.parentPortal.getEmergencyContacts(youthId);
      if (data?.contacts) {
        setEmergencyContacts(data.contacts);
      }
    } catch (err: any) {
      console.error('Failed to load emergency contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadAudit = async (requestId: string) => {
    if (auditRequestId === requestId) {
      setAuditRequestId(null);
      return;
    }
    try {
      setLoadingAudit(true);
      setAuditRequestId(requestId);
      const { data } = await api.consentWallet.getAudit(requestId);
      if (data?.events) {
        setAuditEvents(data.events);
      }
    } catch (err: any) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const [actionError, setActionError] = useState<string | null>(null);

  const handleSign = async (requestId: string) => {
    try {
      setSigningId(requestId);
      setActionError(null);
      const { error } = await api.consentWallet.signRequest(requestId, 'I consent electronically');
      if (error) {
        setActionError(error);
        return;
      }
      loadPendingRequests();
      loadWallet();
    } catch (err: any) {
      console.error('Failed to sign consent:', err);
      setActionError('Failed to sign consent. Please try again.');
    } finally {
      setSigningId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      setDecliningId(requestId);
      setActionError(null);
      const { error } = await api.consentWallet.declineRequest(requestId, declineReason || undefined);
      if (error) {
        setActionError(error);
        return;
      }
      setDeclineReason('');
      setExpandedRequest(null);
      loadPendingRequests();
    } catch (err: any) {
      console.error('Failed to decline consent:', err);
      setActionError('Failed to decline consent. Please try again.');
    } finally {
      setDecliningId(null);
    }
  };

  const handleWithdraw = async (requestId: string) => {
    try {
      setWithdrawingId(requestId);
      setActionError(null);
      const { error } = await api.consentWallet.withdrawRequest(requestId, withdrawReason || undefined);
      if (error) {
        setActionError(error);
        return;
      }
      setWithdrawReason('');
      setShowWithdrawModal(null);
      loadWallet();
    } catch (err: any) {
      console.error('Failed to withdraw consent:', err);
      setActionError('Failed to withdraw consent. Please try again.');
    } finally {
      setWithdrawingId(null);
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

  const handleSaveContact = async () => {
    if (!linkedYouth[0] || !contactForm.name || !contactForm.phone || !contactForm.relationship) return;
    try {
      setSavingContact(true);
      if (editingContact) {
        await api.parentPortal.updateEmergencyContact(editingContact.id, contactForm);
      } else {
        await api.parentPortal.addEmergencyContact(linkedYouth[0].userId, contactForm);
      }
      setShowContactForm(false);
      setEditingContact(null);
      setContactForm({ name: '', phone: '', relationship: '', email: '', isPrimary: false, notes: '' });
      loadEmergencyContacts(linkedYouth[0].userId);
    } catch (err: any) {
      console.error('Failed to save contact:', err);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId || !linkedYouth[0]) return;
    try {
      await api.parentPortal.deleteEmergencyContact(deleteContactId);
      setDeleteContactId(null);
      loadEmergencyContacts(linkedYouth[0].userId);
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleDeleteData = async () => {
    if (!linkedYouth[0]) return;
    try {
      setDeletingData(true);
      const { data, error: apiError } = await api.parentPortal.requestDataDeletion(linkedYouth[0].userId, deleteReason);
      if (apiError) throw new Error(apiError);
      setShowDeleteConfirm(false);
      setDeleteReason('');
      alert(data?.message || 'Deletion request submitted successfully.');
    } catch (err: any) {
      console.error('Failed to request data deletion:', err);
    } finally {
      setDeletingData(false);
    }
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
          <Shield className="w-12 h-12 text-coralText mx-auto" />
          <h2 className="text-2xl font-display font-bold text-deepSage">No Linked Youth</h2>
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

  const youthNames = linkedYouth.map(y => y.preferredName || y.firstName || 'Youth').join(', ');

  return (
    <div className="min-h-screen bg-gradient-cosmic">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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
                  Manage consent for {youthNames}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-coral/10 text-coralText rounded-lg hover:bg-coral/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="cosmic-card p-2 mb-6"
        >
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === 'action' && pendingCount > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors relative ${
                    isActive ? 'bg-teal text-white' : 'text-textSecondaryLight hover:bg-sage/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 bg-coral text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {activeTab === 'action' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {actionError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{actionError}</p>
                  </div>
                  <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {loadingPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-teal" />
              </div>
            ) : pendingRequests.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">
                        {pendingRequests.length} consent {pendingRequests.length === 1 ? 'request' : 'requests'} awaiting your review
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Please review each request carefully. Your consent allows your youth to participate in specific activities.
                      </p>
                    </div>
                  </div>
                </div>

                {pendingRequests.map((req) => {
                  const isExpanded = expandedRequest === req.id;
                  const isExpiring = req.expiresAt && new Date(req.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

                  return (
                    <div key={req.id} className="cosmic-card overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal/10 text-teal">
                                {TYPE_LABELS[req.templateType] || req.templateType}
                              </span>
                              {isExpiring && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                  Expiring soon
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-deepSage">{req.templateName}</h3>
                            <p className="text-sm text-textSecondaryLight mt-1">
                              For: {req.youthName}
                            </p>
                          </div>
                          <button
                            onClick={() => setExpandedRequest(isExpanded ? null : req.id)}
                            className="p-2 text-textSecondaryLight hover:text-deepSage transition-colors"
                            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>

                        {req.templateDescription && (
                          <p className="text-sm text-textSecondaryLight mb-3">{req.templateDescription}</p>
                        )}

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              {req.templateBody && (
                                <div className="bg-sage/5 rounded-lg p-4 mb-4 text-sm text-deepSage whitespace-pre-wrap">
                                  {req.templateBody}
                                </div>
                              )}
                              <div className="text-xs text-textSecondaryLight space-y-1 mb-4">
                                <p>Version: {req.templateVersion}</p>
                                <p>Requested: {new Date(req.createdAt).toLocaleDateString()}</p>
                                {req.expiresAt && (
                                  <p>Expires: {new Date(req.expiresAt).toLocaleDateString()}</p>
                                )}
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-deepSage mb-1">
                                  Reason for declining (optional)
                                </label>
                                <textarea
                                  value={declineReason}
                                  onChange={(e) => setDeclineReason(e.target.value)}
                                  placeholder="Optional reason..."
                                  className="w-full p-2 border border-sage/30 rounded-lg text-sm resize-none"
                                  rows={2}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => handleSign(req.id)}
                            disabled={signingId === req.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 font-medium"
                          >
                            {signingId === req.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            <span>Give Consent</span>
                          </button>
                          <button
                            onClick={() => handleDecline(req.id)}
                            disabled={decliningId === req.id}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sage/10 text-deepSage rounded-lg hover:bg-sage/20 transition-colors disabled:opacity-50"
                          >
                            {decliningId === req.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="cosmic-card p-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="font-medium text-deepSage">All caught up!</p>
                <p className="text-sm text-textSecondaryLight mt-1">
                  No consent requests need your attention right now.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'wallet' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {loadingWallet ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-teal" />
              </div>
            ) : wallet.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Your Consent Wallet</p>
                      <p className="text-sm text-blue-700 mt-1">
                        All consent you've given or withdrawn. You may withdraw active consent at any time — your youth keeps app access.
                      </p>
                    </div>
                  </div>
                </div>

                {wallet.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.requestStatus] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <div key={item.receiptId} className={`cosmic-card border ${item.isActive ? 'border-green-200' : 'border-gray-200'}`}>
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal/10 text-teal">
                                {TYPE_LABELS[item.templateType] || item.templateType}
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                                <StatusIcon className="w-3 h-3 inline mr-1" />
                                {statusCfg.label}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-deepSage">{item.templateName}</h3>
                            <p className="text-sm text-textSecondaryLight mt-1">
                              For: {item.youthName}
                            </p>
                            {item.templateDescription && (
                              <p className="text-sm text-textSecondaryLight mt-1">{item.templateDescription}</p>
                            )}
                            <div className="text-xs text-textSecondaryLight mt-2 space-y-0.5">
                              <p>Signed: {new Date(item.signedAt).toLocaleDateString()}</p>
                              <p>Version: {item.templateVersion}</p>
                              {item.withdrawnAt && (
                                <p className="text-red-600">Withdrawn: {new Date(item.withdrawnAt).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          {item.isActive && (
                            <button
                              onClick={() => {
                                setShowWithdrawModal(item.requestId);
                                setWithdrawReason('');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-coral/10 text-coralText rounded-lg hover:bg-coral/20 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Withdraw
                            </button>
                          )}
                          <button
                            onClick={() => loadAudit(item.requestId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-sage/10 text-deepSage rounded-lg hover:bg-sage/20 transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                            {auditRequestId === item.requestId ? 'Hide History' : 'View History'}
                          </button>
                        </div>

                        <AnimatePresence>
                          {auditRequestId === item.requestId && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden mt-4"
                            >
                              {loadingAudit ? (
                                <div className="flex justify-center py-4">
                                  <Loader className="w-4 h-4 animate-spin text-teal" />
                                </div>
                              ) : auditEvents.length > 0 ? (
                                <div className="border-l-2 border-sage/20 pl-4 space-y-3">
                                  {auditEvents.map((evt) => (
                                    <div key={evt.id} className="text-xs text-textSecondaryLight">
                                      <p className="font-medium text-deepSage capitalize">
                                        {evt.action.replace(/_/g, ' ')}
                                      </p>
                                      <p>{new Date(evt.occurredAt).toLocaleString()}</p>
                                      <p className="capitalize">By: {evt.actorType}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-textSecondaryLight py-2">No history available.</p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="cosmic-card p-12 text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-teal opacity-30" />
                <p className="font-medium text-deepSage">No Consents Yet</p>
                <p className="text-sm text-textSecondaryLight mt-1">
                  Consents you sign will appear here in your wallet.
                </p>
              </div>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-teal" />
                </div>
              ) : emergencyContacts.length > 0 ? (
                <div className="space-y-3">
                  {emergencyContacts.map((contact) => (
                    <div key={contact.id} className="p-4 rounded-lg border border-sage/20 hover:border-teal/20 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-deepSage">{contact.name}</h4>
                            {contact.isPrimary && (
                              <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full">Primary</span>
                            )}
                          </div>
                          <p className="text-sm text-textSecondaryLight">{contact.relationship}</p>
                          <p className="text-sm text-deepSage mt-1">{contact.phone}</p>
                          {contact.email && (
                            <p className="text-sm text-textSecondaryLight">{contact.email}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
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
                            }}
                            className="p-2 text-textSecondaryLight hover:text-teal transition-colors"
                            aria-label="Edit contact"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteContactId(contact.id)}
                            className="p-2 text-textSecondaryLight hover:text-coralText transition-colors"
                            aria-label="Delete contact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-textSecondaryLight">
                  <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-deepSage">No Emergency Contacts</p>
                  <p className="text-sm mt-1">Add trusted contacts who can be reached in an emergency.</p>
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
                  <h4 className="font-medium text-blue-900">Your Rights Under PIPA/PIPEDA</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    You have the right to access, export, and request deletion of your youth's personal data.
                    To exercise these rights, please contact Room XI directly.
                  </p>
                </div>
              </div>
            </div>

            <div className="cosmic-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-teal" />
                <h3 className="text-lg font-semibold text-deepSage">Data Requests</h3>
              </div>
              <p className="text-sm text-textSecondaryLight mb-4">
                To request a data export or deletion, please contact Room XI administration. All requests are processed within 30 days in accordance with PIPA/PIPEDA regulations.
              </p>
              <a
                href="mailto:info@roomxi.ca"
                className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors inline-flex"
              >
                <FileText className="w-4 h-4" />
                <span>Contact Room XI</span>
              </a>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Privacy-First Approach</h4>
              <p className="text-sm text-blue-700 mt-1">
                Room XI Connect gives youth control over their privacy. This portal shows only consent-related information.
                If you have concerns about your youth's wellbeing, we encourage open conversations.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-coralText" />
              <h3 className="text-lg font-semibold text-deepSage">Withdraw Consent</h3>
            </div>
            <p className="text-sm text-textSecondaryLight mb-4">
              Withdrawing consent means the activity covered by this consent will no longer be authorized.
              Your youth retains full app access.
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
                onClick={() => setShowWithdrawModal(null)}
                className="flex-1 px-4 py-2 bg-sage/10 text-deepSage rounded-lg hover:bg-sage/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleWithdraw(showWithdrawModal)}
                disabled={withdrawingId === showWithdrawModal}
                className="flex-1 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50"
              >
                {withdrawingId === showWithdrawModal ? 'Processing...' : 'Withdraw Consent'}
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
                  placeholder="e.g., Grandmother, Uncle"
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
              <Trash2 className="w-6 h-6 text-coralText" />
              <h3 className="text-lg font-semibold text-deepSage">Delete Contact</h3>
            </div>
            <p className="text-sm text-textSecondaryLight mb-4">
              Are you sure you want to remove this emergency contact?
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
              <Trash2 className="w-6 h-6 text-coralText" />
              <h3 className="text-lg font-semibold text-deepSage">Request Data Deletion</h3>
            </div>
            <div className="bg-coral/10 border border-coral/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-coralText font-medium">This action cannot be undone</p>
              <p className="text-xs text-coral/80 mt-1">
                All data will be permanently deleted after administrator review.
              </p>
            </div>
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
