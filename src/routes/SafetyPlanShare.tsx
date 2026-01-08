import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Phone, 
  MessageSquare, 
  AlertTriangle, 
  Wind, 
  MapPin, 
  Users, 
  Sparkles, 
  FileText,
  Heart,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import CrisisSheet from '@/ui/crisis/CrisisSheet';

interface TrustedContact {
  name: string;
  phone: string;
  relationship: string;
  preferredMethod: 'call' | 'text';
}

interface ProfessionalSupport {
  name: string;
  phone: string;
  notes: string;
}

interface NotesForOthers {
  whatHelps: string;
  whatDoesntHelp: string;
  howToSupport: string;
}

interface SafetyPlanData {
  warningSigns: string[];
  copingSteps: string[];
  safePlaces: string[];
  trustedContacts: TrustedContact[];
  professionalSupport: ProfessionalSupport[];
  escalationSteps: string[];
  notesForOthers: NotesForOthers;
}

interface SharedPlanResponse {
  ownerFirstName: string | null;
  planData: SafetyPlanData;
  planVersion: number;
  lastReviewedAt: string | null;
}

function ReadOnlySection({ 
  title, 
  icon, 
  children,
  isEmpty 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  if (isEmpty) return null;
  
  return (
    <div className="cosmic-card p-4 space-y-3">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-semibold text-deepSage">{title}</h3>
      </div>
      <div className="pl-13">{children}</div>
    </div>
  );
}

export default function SafetyPlanShare() {
  const { token } = useParams<{ token: string }>();
  const [plan, setPlan] = useState<SharedPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCrisisSheet, setShowCrisisSheet] = useState(false);

  useEffect(() => {
    if (token) {
      loadSharedPlan();
    }
  }, [token]);

  const loadSharedPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: apiError } = await api.safetyPlan.viewShared(token!);
      
      if (apiError) {
        setError(apiError);
        return;
      }
      
      setPlan(data);
    } catch (err) {
      setError('Failed to load safety plan');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleText = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-textSecondaryLight">Loading safety plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-4">
        <div className="cosmic-card p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-coral" />
          </div>
          <h1 className="text-xl font-bold text-deepSage">Unable to View Plan</h1>
          <p className="text-textSecondaryLight">
            {error.includes('expired') 
              ? 'This share link has expired. Please ask the plan owner for a new link.'
              : error.includes('revoked')
              ? 'This share link has been revoked by the plan owner.'
              : 'This share link is invalid or no longer available.'}
          </p>
          <button
            onClick={() => setShowCrisisSheet(true)}
            className="w-full bg-coral text-white font-bold py-3 px-6 rounded-xl hover:bg-coral/90 transition-colors mt-4"
          >
            Need Crisis Support?
          </button>
        </div>
        <CrisisSheet open={showCrisisSheet} onClose={() => setShowCrisisSheet(false)} />
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  const { planData, ownerFirstName, lastReviewedAt } = plan;

  return (
    <div className="min-h-screen bg-cream py-6 px-4 space-y-6 pb-32">
      <motion.div
        className="cosmic-card p-4 bg-coral/10 border border-coral/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => setShowCrisisSheet(true)}
          className="w-full flex items-center justify-center space-x-2 text-coral font-bold"
        >
          <Phone className="w-5 h-5" />
          <span>Need Immediate Help? Tap for Crisis Support</span>
        </button>
      </motion.div>

      <motion.div
        className="text-center space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-teal" />
        </div>
        <h1 className="text-2xl font-display font-bold text-deepSage">
          {ownerFirstName ? `${ownerFirstName}'s Safety Plan` : 'Safety Plan'}
        </h1>
        {lastReviewedAt && (
          <div className="flex items-center justify-center space-x-2 text-sm text-textSecondaryLight">
            <Clock className="w-4 h-4" />
            <span>Last reviewed: {new Date(lastReviewedAt).toLocaleDateString()}</span>
          </div>
        )}
      </motion.div>

      <div className="space-y-4">
        <ReadOnlySection 
          title="Warning Signs" 
          icon={<AlertTriangle className="w-5 h-5 text-teal" />}
          isEmpty={!planData.warningSigns?.length}
        >
          <ul className="space-y-1">
            {planData.warningSigns?.map((sign, i) => (
              <li key={i} className="text-deepSage flex items-start space-x-2">
                <span className="text-teal mt-1">•</span>
                <span>{sign}</span>
              </li>
            ))}
          </ul>
        </ReadOnlySection>

        <ReadOnlySection 
          title="Coping Steps" 
          icon={<Wind className="w-5 h-5 text-teal" />}
          isEmpty={!planData.copingSteps?.length}
        >
          <ol className="space-y-1 list-decimal list-inside">
            {planData.copingSteps?.map((step, i) => (
              <li key={i} className="text-deepSage">{step}</li>
            ))}
          </ol>
        </ReadOnlySection>

        <ReadOnlySection 
          title="Safe Places" 
          icon={<MapPin className="w-5 h-5 text-teal" />}
          isEmpty={!planData.safePlaces?.length}
        >
          <ul className="space-y-1">
            {planData.safePlaces?.map((place, i) => (
              <li key={i} className="text-deepSage flex items-start space-x-2">
                <span className="text-teal mt-1">•</span>
                <span>{place}</span>
              </li>
            ))}
          </ul>
        </ReadOnlySection>

        <ReadOnlySection 
          title="Trusted Contacts" 
          icon={<Users className="w-5 h-5 text-teal" />}
          isEmpty={!planData.trustedContacts?.length}
        >
          <div className="space-y-3">
            {planData.trustedContacts?.map((contact, i) => (
              <div key={i} className="p-3 bg-surface rounded-lg border border-borderMutedLight/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-deepSage">{contact.name}</div>
                    {contact.relationship && (
                      <div className="text-sm text-textSecondaryLight">{contact.relationship}</div>
                    )}
                  </div>
                </div>
                {contact.phone && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCall(contact.phone)}
                      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        contact.preferredMethod === 'call'
                          ? 'bg-teal text-white'
                          : 'bg-teal/10 text-teal hover:bg-teal/20'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call</span>
                    </button>
                    <button
                      onClick={() => handleText(contact.phone)}
                      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        contact.preferredMethod === 'text'
                          ? 'bg-teal text-white'
                          : 'bg-teal/10 text-teal hover:bg-teal/20'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Text</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ReadOnlySection>

        <div className="cosmic-card p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-teal" />
            </div>
            <h3 className="font-semibold text-deepSage">Professional Support</h3>
          </div>
          <div className="pl-13 space-y-3">
            <button
              onClick={() => setShowCrisisSheet(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-coral/10 text-coral rounded-lg hover:bg-coral/20 transition-colors font-medium"
            >
              <Phone className="w-5 h-5" />
              <span>View Crisis Support Lines</span>
            </button>
            
            {planData.professionalSupport?.length > 0 && (
              <div className="pt-2 border-t border-borderMutedLight/50 space-y-3">
                {planData.professionalSupport.map((support, i) => (
                  <div key={i} className="p-3 bg-surface rounded-lg border border-borderMutedLight/50">
                    <div className="font-medium text-deepSage">{support.name}</div>
                    {support.notes && (
                      <div className="text-sm text-textSecondaryLight mb-2">{support.notes}</div>
                    )}
                    {support.phone && (
                      <button
                        onClick={() => handleCall(support.phone)}
                        className="flex items-center space-x-2 px-3 py-2 bg-teal/10 text-teal rounded-lg hover:bg-teal/20 transition-colors text-sm font-medium"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call {support.phone}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <ReadOnlySection 
          title="Escalation Steps" 
          icon={<Sparkles className="w-5 h-5 text-teal" />}
          isEmpty={!planData.escalationSteps?.length}
        >
          <ol className="space-y-1 list-decimal list-inside">
            {planData.escalationSteps?.map((step, i) => (
              <li key={i} className="text-deepSage">{step}</li>
            ))}
          </ol>
        </ReadOnlySection>

        <ReadOnlySection 
          title="Notes for Supporters" 
          icon={<FileText className="w-5 h-5 text-teal" />}
          isEmpty={!planData.notesForOthers?.whatHelps && !planData.notesForOthers?.whatDoesntHelp && !planData.notesForOthers?.howToSupport}
        >
          <div className="space-y-4">
            {planData.notesForOthers?.whatHelps && (
              <div>
                <div className="text-sm font-medium text-teal mb-1 flex items-center space-x-2">
                  <Heart className="w-4 h-4" />
                  <span>What helps</span>
                </div>
                <p className="text-deepSage">{planData.notesForOthers.whatHelps}</p>
              </div>
            )}
            {planData.notesForOthers?.whatDoesntHelp && (
              <div>
                <div className="text-sm font-medium text-coral mb-1 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>What doesn't help</span>
                </div>
                <p className="text-deepSage">{planData.notesForOthers.whatDoesntHelp}</p>
              </div>
            )}
            {planData.notesForOthers?.howToSupport && (
              <div>
                <div className="text-sm font-medium text-gold mb-1 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>How to support</span>
                </div>
                <p className="text-deepSage">{planData.notesForOthers.howToSupport}</p>
              </div>
            )}
          </div>
        </ReadOnlySection>
      </div>

      <motion.div
        className="fixed bottom-4 left-4 right-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => setShowCrisisSheet(true)}
          className="w-full bg-coral text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-coral/90 transition-colors flex items-center justify-center space-x-2"
        >
          <Phone className="w-5 h-5" />
          <span>Crisis Support Lines</span>
        </button>
      </motion.div>

      <CrisisSheet open={showCrisisSheet} onClose={() => setShowCrisisSheet(false)} />
    </div>
  );
}
