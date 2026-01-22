import { CheckCircle, XCircle, Clock, Shield } from 'lucide-react';

interface ConsentLevel {
  share_mood_timeline?: boolean;
  share_program_engagement?: boolean;
  share_checkin_streak?: boolean;
}

interface ConsentStatusBadgeProps {
  consentLevel?: ConsentLevel;
  consentStatus: 'granted' | 'pending' | 'denied' | 'revoked';
  showDetails?: boolean;
}

const statusConfig = {
  granted: {
    icon: CheckCircle,
    label: 'Consent Granted',
    bgColor: 'bg-teal/10',
    textColor: 'text-teal',
    borderColor: 'border-teal/30',
  },
  pending: {
    icon: Clock,
    label: 'Pending Consent',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  denied: {
    icon: XCircle,
    label: 'Consent Denied',
    bgColor: 'bg-coral/10',
    textColor: 'text-coral',
    borderColor: 'border-coral/30',
  },
  revoked: {
    icon: XCircle,
    label: 'Consent Revoked',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-300',
  },
};

const consentLevelLabels: Record<string, string> = {
  share_mood_timeline: 'Mood Timeline',
  share_program_engagement: 'Program Engagement',
  share_checkin_streak: 'Check-in Streak',
};

export function ConsentStatusBadge({ consentLevel, consentStatus, showDetails = false }: ConsentStatusBadgeProps) {
  const config = statusConfig[consentStatus] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor}`}>
        <Icon className={`w-4 h-4 ${config.textColor}`} />
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      {showDetails && consentStatus === 'granted' && consentLevel && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(consentLevel).map(([key, value]) => (
            <div
              key={key}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                value
                  ? 'bg-teal/10 text-teal border border-teal/20'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>{consentLevelLabels[key] || key}</span>
              {value ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConsentStatusBadge;
