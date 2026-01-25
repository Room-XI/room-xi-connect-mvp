import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  FileText,
  Clock,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { BreachManagement } from '@/ui/admin/BreachManagement';

interface ComplianceStatus {
  pipa: boolean;
  pipeda: boolean;
  dataRetention: boolean;
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  auditLogging: boolean;
  consentManagement: boolean;
}

const COMPLIANCE_DOCS = [
  {
    title: 'Privacy Impact Assessment (PIA)',
    path: '/compliance/PIA_SUBMISSION.md',
    description: 'OIPC Alberta PIA documentation'
  },
  {
    title: 'Data Retention Policy',
    path: '/docs/BACKUP_AND_RECOVERY.md',
    description: '90-day retention with automated cleanup'
  },
  {
    title: 'Breach Response Runbook',
    path: '/BREACH_RUNBOOK.md',
    description: 'Incident response procedures'
  },
  {
    title: 'Security Architecture',
    path: '/SECURITY_ARCHITECTURE.md',
    description: 'Technical security implementation'
  }
];

const DATA_RETENTION_SUMMARY = [
  { type: 'Check-in Data', retention: '90 days', status: 'active' },
  { type: 'Ximi Conversations', retention: '30 days', status: 'active' },
  { type: 'Audit Logs', retention: '2 years', status: 'active' },
  { type: 'Consent Records', retention: 'Permanent', status: 'active' },
  { type: 'Account Data', retention: 'Until deletion', status: 'active' }
];

export default function Compliance() {
  const [complianceStatus] = useState<ComplianceStatus>({
    pipa: true,
    pipeda: true,
    dataRetention: true,
    encryptionAtRest: true,
    encryptionInTransit: true,
    auditLogging: true,
    consentManagement: true
  });

  const allCompliant = Object.values(complianceStatus).every(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-deepSage">Breach & Compliance</h1>
        <p className="text-textSecondaryLight mt-1">
          PIPA/PIPEDA compliance status and breach management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="cosmic-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className={`p-2 rounded-lg ${
                allCompliant ? 'bg-teal/10' : 'bg-coral/10'
              }`}
            >
              <Shield
                className={`w-6 h-6 ${allCompliant ? 'text-teal' : 'text-coral'}`}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-deepSage">
                Compliance Status
              </h2>
              <p className="text-sm text-textSecondaryLight">
                {allCompliant
                  ? 'All requirements met'
                  : 'Some requirements need attention'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: 'pipa', label: 'PIPA (Alberta)' },
              { key: 'pipeda', label: 'PIPEDA (Federal)' },
              { key: 'dataRetention', label: 'Data Retention Policy' },
              { key: 'encryptionAtRest', label: 'Encryption at Rest' },
              { key: 'encryptionInTransit', label: 'Encryption in Transit' },
              { key: 'auditLogging', label: 'Audit Logging' },
              { key: 'consentManagement', label: 'Consent Management' }
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2 border-b border-borderMutedLight last:border-0"
              >
                <span className="text-deepSage">{item.label}</span>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    complianceStatus[item.key as keyof ComplianceStatus]
                      ? 'text-teal'
                      : 'text-coral'
                  }`}
                >
                  {complianceStatus[item.key as keyof ComplianceStatus] ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Compliant
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Needs Attention
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="cosmic-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-sage/10">
              <Clock className="w-6 h-6 text-sage" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-deepSage">
                Data Retention Summary
              </h2>
              <p className="text-sm text-textSecondaryLight">
                Automated data lifecycle management
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {DATA_RETENTION_SUMMARY.map((item) => (
              <div
                key={item.type}
                className="flex items-center justify-between py-2 border-b border-borderMutedLight last:border-0"
              >
                <span className="text-deepSage">{item.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-textSecondaryLight">
                    {item.retention}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-teal/10 text-teal">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="cosmic-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gold/10">
            <FileText className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-deepSage">
              Compliance Documentation
            </h2>
            <p className="text-sm text-textSecondaryLight">
              Quick access to compliance resources
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMPLIANCE_DOCS.map((doc) => (
            <a
              key={doc.path}
              href={doc.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-lg border border-borderMutedLight hover:bg-sage/5 transition-colors group"
            >
              <FileText className="w-5 h-5 text-sage mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-deepSage group-hover:text-teal transition-colors">
                    {doc.title}
                  </span>
                  <ExternalLink className="w-3 h-3 text-sage opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-textSecondaryLight mt-0.5">
                  {doc.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <BreachManagement />
      </motion.div>
    </div>
  );
}
