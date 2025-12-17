import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, Check, Clock, AlertTriangle, Copy, Share2 } from 'lucide-react';

interface GuardianStatus {
  required: boolean;
  status: string | null;
  guardianEmail: string;
  guardianName: string;
  sentAt: string;
  expiresAt: string;
  verifiedAt: string | null;
  isExpired: boolean;
  canResend: boolean;
}

export default function GuardianConsentStatus() {
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [consentLink, setConsentLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/consent/guardian-status', {
        credentials: 'include',
      });
      
      if (response.status === 401) {
        setStatus(null);
        return;
      }
      
      if (!response.ok) {
        console.error('Guardian status check failed:', response.status);
        setStatus(null);
        return;
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch guardian status:', error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setMessage(null);
      
      const response = await fetch('/api/consent/resend-guardian', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Consent request sent successfully!');
        setConsentLink(data.consentLink);
        await fetchStatus();
      } else {
        setMessage(data.error || 'Failed to resend. Please try again.');
      }
    } catch (error) {
      console.error('Failed to resend consent:', error);
      setMessage('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!consentLink) return;
    
    try {
      await navigator.clipboard.writeText(consentLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = consentLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  const handleShare = async () => {
    if (!consentLink) return;
    
    const shareData = {
      title: 'Room XI Connect - Guardian Consent',
      text: 'Please review and approve the consent request for Room XI Connect',
      url: consentLink,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
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

  if (!status || !status.required) {
    return null;
  }

  const getStatusInfo = () => {
    if (status.status === 'confirmed' || status.verifiedAt) {
      return {
        icon: Check,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Verified',
        description: `Consent confirmed on ${new Date(status.verifiedAt!).toLocaleDateString('en-CA', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}`,
      };
    }
    
    if (status.isExpired) {
      return {
        icon: AlertTriangle,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        label: 'Link Expired',
        description: 'The consent link has expired. Please resend.',
      };
    }
    
    return {
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      label: 'Pending',
      description: `Waiting for ${status.guardianName || 'guardian'} to respond`,
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      className="cosmic-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.6 }}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple-600" />
        </div>
        <h3 className="font-semibold text-deepSage">Guardian Consent</h3>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo.bg}`}>
            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
          </div>
          <div>
            <p className="font-medium text-deepSage">{statusInfo.label}</p>
            <p className="text-sm text-textSecondaryLight">{statusInfo.description}</p>
          </div>
        </div>
      </div>

      {status.guardianEmail && (
        <div className="text-sm text-textSecondaryLight">
          Consent request sent to: <span className="font-medium">{status.guardianEmail}</span>
        </div>
      )}

      {message && (
        <div className={`text-sm p-3 rounded-lg ${
          message.includes('success') 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {consentLink && (
        <div className="space-y-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 break-all">{consentLink}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handleCopyLink}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
                linkCopied 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {linkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {status.canResend && status.status !== 'confirmed' && (
        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
          {resending ? 'Sending...' : 'Resend Consent Request'}
        </button>
      )}
    </motion.div>
  );
}
