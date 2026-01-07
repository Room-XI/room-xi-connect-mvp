import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, Check, Clock, AlertTriangle, Copy, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';

interface Guardian {
  id: string;
  status: string | null;
  guardianEmail: string;
  guardianName: string;
  guardianRole: string | null;
  sentAt: string;
  expiresAt: string;
  verifiedAt: string | null;
  isExpired: boolean;
  canResend: boolean;
}

interface GuardianStatusResponse {
  required: boolean;
  guardians: Guardian[];
}

export default function GuardianConsentStatus() {
  const [data, setData] = useState<GuardianStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [consentLink, setConsentLink] = useState<{ id: string, url: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const result = await api.consent.guardianStatus();
      
      if (result.error) {
        console.error('Guardian status check failed:', result.error);
        setData(null);
        return;
      }
      
      setData(result.data);
      // Auto-expand the first pending one if exists
      if (result.data?.guardians?.length > 0) {
        const pending = result.data.guardians.find((g: Guardian) => g.status !== 'confirmed');
        setExpandedId(pending?.id || result.data.guardians[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch guardian status:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (guardianId: string) => {
    try {
      setResendingId(guardianId);
      setMessage(null);
      
      // The current resend API might only handle the "primary" one or needs to be updated
      // to handle specific guardian IDs. For now we use existing API.
      const result = await api.consent.resendGuardian();
      
      if (result.error) {
        setMessage(result.error || 'Failed to resend. Please try again.');
      } else if (result.data) {
        setMessage(result.data.message || 'Consent request sent!');
        setConsentLink({ id: guardianId, url: result.data.consentLink });
        
        if (!result.data.emailSent) {
          setMessage('Email could not be sent. Please share the link below with your parent/guardian.');
        }
        
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to resend consent:', error);
      setMessage('Failed to resend. Please try again.');
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyLink = async () => {
    if (!consentLink) return;
    
    try {
      await navigator.clipboard.writeText(consentLink.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = consentLink.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="cosmic-card p-6 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sage/10 rounded-lg" />
          <div className="h-5 bg-sage/10 rounded w-40" />
        </div>
      </div>
    );
  }

  if (!data || !data.required) {
    return null;
  }

  const getGuardianStatusInfo = (guardian: Guardian) => {
    if (guardian.status === 'confirmed' || guardian.verifiedAt) {
      return {
        icon: Check,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Verified',
        description: `Confirmed on ${new Date(guardian.verifiedAt!).toLocaleDateString('en-CA', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`,
      };
    }
    
    if (guardian.isExpired) {
      return {
        icon: AlertTriangle,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        label: 'Link Expired',
        description: 'Link has expired. Please resend.',
      };
    }
    
    return {
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      label: 'Pending',
      description: 'Waiting for response',
    };
  };

  return (
    <motion.div
      className="cosmic-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.6 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-semibold text-deepSage">Guardian Consent</h3>
        </div>
        <span className="text-xs font-medium px-2 py-1 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
          {data.guardians.length} Guardian{data.guardians.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {data.guardians.map((guardian) => {
          const statusInfo = getGuardianStatusInfo(guardian);
          const StatusIcon = statusInfo.icon;
          const isExpanded = expandedId === guardian.id;

          return (
            <div 
              key={guardian.id}
              className={`border rounded-xl transition-all ${isExpanded ? 'border-purple-200 bg-purple-50/30' : 'border-sage/10 hover:border-purple-100'}`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : guardian.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-deepSage flex items-center gap-2">
                      {guardian.guardianName || 'Guardian'}
                      {guardian.guardianRole && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-sage/10 text-textSecondaryLight rounded">
                          {guardian.guardianRole}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-textSecondaryLight">{statusInfo.label}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-textSecondaryLight" /> : <ChevronDown className="w-4 h-4 text-textSecondaryLight" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-purple-100/50 pt-3">
                      <div className="space-y-1">
                        <p className="text-xs text-textSecondaryLight">Email Address</p>
                        <p className="text-sm font-medium text-deepSage">{guardian.guardianEmail}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-textSecondaryLight">Status Details</p>
                        <p className="text-sm text-deepSage">{statusInfo.description}</p>
                      </div>

                      {guardian.canResend && guardian.status !== 'confirmed' && (
                        <button
                          onClick={() => handleResend(guardian.id)}
                          disabled={resendingId === guardian.id}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50 shadow-md shadow-purple-200"
                        >
                          <RefreshCw className={`w-4 h-4 ${resendingId === guardian.id ? 'animate-spin' : ''}`} />
                          {resendingId === guardian.id ? 'Sending...' : 'Resend Request'}
                        </button>
                      )}

                      {consentLink && consentLink.id === guardian.id && (
                        <div className="space-y-2 pt-2">
                          <div className="bg-white border border-purple-100 rounded-lg p-3">
                            <p className="text-[10px] text-textSecondaryLight break-all leading-relaxed font-mono">{consentLink.url}</p>
                          </div>
                          <button
                            onClick={handleCopyLink}
                            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
                              linkCopied 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-sage/10 text-deepSage hover:bg-sage/20'
                            }`}
                          >
                            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {linkCopied ? 'Copied!' : 'Copy Link to Share'}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {message && !consentLink && (
        <div className={`text-sm p-3 rounded-lg ${
          message.includes('success') || message.includes('sent')
            ? 'bg-green-50 text-green-700' 
            : message.includes('share the link')
            ? 'bg-amber-50 text-amber-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}
    </motion.div>
  );
}
