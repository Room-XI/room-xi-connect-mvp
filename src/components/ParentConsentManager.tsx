import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface Consent {
  consentType: string;
  value: boolean;
  grantedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ParentConsentManagerProps {
  userId: string;
  youthName?: string;
}

export default function ParentConsentManager({ userId, youthName }: ParentConsentManagerProps) {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingConsents();
  }, [userId]);

  const loadPendingConsents = async () => {
    try {
      setLoading(true);
      const { data, error: apiError } = await api.consentAuto.getPending(userId);

      if (apiError) {
        throw new Error(apiError);
      }

      setConsents(data?.consents || []);
    } catch (err: any) {
      console.error('Failed to load consents:', err);
      setError(err.message || 'Failed to load consent requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (consentType: string, value: boolean) => {
    try {
      setUpdating(consentType);
      setError(null);

      const { error: apiError } = await api.consentAuto.approve(userId, consentType, value);

      if (apiError) {
        throw new Error(apiError);
      }

      await loadPendingConsents();
    } catch (err: any) {
      console.error('Failed to update consent:', err);
      setError(err.message || 'Failed to update consent');
    } finally {
      setUpdating(null);
    }
  };

  const getConsentLabel = (consentType: string) => {
    if (consentType === 'terms_of_use') return 'Terms of Use';
    if (consentType === 'privacy_notice') return 'Privacy Notice';
    if (consentType.startsWith('program:')) {
      const programId = consentType.split(':')[1];
      return `Program Registration (${programId})`;
    }
    return consentType;
  };

  const getConsentDescription = (consentType: string) => {
    if (consentType === 'terms_of_use') {
      return 'Grant permission to use Room XI Connect platform';
    }
    if (consentType === 'privacy_notice') {
      return 'Acknowledge privacy practices and data handling';
    }
    if (consentType.startsWith('program:')) {
      return 'Allow registration and participation in this program';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="cosmic-card p-6 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  const pendingConsents = consents.filter(c => !c.value);

  if (pendingConsents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="cosmic-card p-6"
      >
        <div className="flex items-center space-x-3 text-teal">
          <CheckCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold text-deepSage">All Set!</h3>
            <p className="text-sm text-textSecondaryLight">
              No pending consent requests for {youthName || 'this youth'}.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cosmic-card p-6 space-y-4"
    >
      <div className="flex items-center space-x-2">
        <Shield className="w-5 h-5 text-teal" />
        <h3 className="font-semibold text-deepSage">
          Consent Requests {youthName && `for ${youthName}`}
        </h3>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start space-x-2 p-3 bg-coral/10 border border-coral/30 rounded-lg"
        >
          <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
          <p className="text-sm text-coral">{error}</p>
        </motion.div>
      )}

      <div className="space-y-3">
        {pendingConsents.map((consent) => (
          <div
            key={consent.consentType}
            className="p-4 border border-sage/30 rounded-lg space-y-3"
          >
            <div>
              <h4 className="font-medium text-deepSage">
                {getConsentLabel(consent.consentType)}
              </h4>
              <p className="text-sm text-textSecondaryLight mt-1">
                {getConsentDescription(consent.consentType)}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleApprove(consent.consentType, true)}
                disabled={updating === consent.consentType}
                className="flex-1 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {updating === consent.consentType ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleApprove(consent.consentType, false)}
                disabled={updating === consent.consentType}
                className="flex-1 px-4 py-2 bg-coral/10 text-coral rounded-lg hover:bg-coral/20 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {updating === consent.consentType ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Decline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-sage/20">
        <p className="text-xs text-textSecondaryLight">
          <strong>Your Role:</strong> As a parent/guardian, you control platform access and program participation. 
          Approving allows your youth to use the service. Declining will prevent access.
        </p>
      </div>
    </motion.div>
  );
}
