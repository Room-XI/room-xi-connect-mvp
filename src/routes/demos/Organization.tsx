import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight,
  BarChart3, 
  Users, 
  Shield, 
  FileText,
  QrCode,
  TrendingUp,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  Building2,
  Eye,
  Lock,
  Activity
} from 'lucide-react';

interface FeatureSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  features: string[];
  dataProvided: string[];
}

const features: FeatureSection[] = [
  {
    id: 'dashboard',
    title: 'Real-Time Analytics Dashboard',
    subtitle: 'Live insights into youth engagement',
    icon: <BarChart3 className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-teal/20 to-sage/20',
    description: 'Monitor youth wellness trends, program engagement, and crisis patterns across your organization. All data is aggregated and privacy-protected.',
    features: [
      'Live user counts and active engagement',
      'Check-in completion rates and trends',
      'Program popularity and attendance metrics',
      'User growth over time (30-day, 90-day views)',
      'Exportable reports (CSV, JSON)',
      'Role-based access control for staff'
    ],
    dataProvided: [
      'Total registered users and monthly active users',
      'Daily/weekly check-in completion rates',
      'Average mood levels (aggregated, anonymized)',
      'Program discovery and save rates',
      'Peak engagement times'
    ]
  },
  {
    id: 'attendance',
    title: 'QR Attendance Tracking',
    subtitle: 'Paperless program check-ins',
    icon: <QrCode className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-gold/20 to-coral/20',
    description: 'Replace paper sign-in sheets with instant QR code attendance. Youth scan to check in, and you get real-time attendance data.',
    features: [
      'Unique QR codes for each program/session',
      'Instant attendance capture on scan',
      'Historical attendance reports',
      'Export attendance data for funders',
      'Works offline (syncs when connected)',
      'Privacy-preserving (uses anonymous XID)'
    ],
    dataProvided: [
      'Program attendance by date and time',
      'Repeat attendance patterns',
      'Program popularity comparisons',
      'Seasonal attendance trends'
    ]
  },
  {
    id: 'crisis',
    title: 'Crisis Monitoring',
    subtitle: 'Real-time safety alerts',
    icon: <AlertTriangle className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-coral/20 to-rose-200',
    description: 'Ximi AI detects crisis keywords and escalates appropriately. Staff can monitor crisis flag patterns (aggregate only) to understand community needs.',
    features: [
      'Real-time crisis keyword detection in Ximi chats',
      'Automatic escalation to Kids Help Phone',
      'Aggregate crisis pattern reporting',
      'Crisis resolution tracking',
      'Never shows individual conversations (privacy protected)'
    ],
    dataProvided: [
      'Total crisis flags detected (count only)',
      'Crisis resolution rate',
      'Peak crisis times (for staffing)',
      'Trend data (increasing/decreasing)'
    ]
  },
  {
    id: 'demographics',
    title: 'Demographics Insights',
    subtitle: 'Understand who you\'re serving',
    icon: <Users className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-cosmic/20 to-teal/20',
    description: 'See aggregate demographics of youth using your programs. Identify underserved populations and equity gaps. Youth self-report their identity privately.',
    features: [
      'Age distribution of users',
      'Gender identity breakdown (aggregated)',
      'Racial/ethnic identity (aggregated)',
      'Indigenous self-identification',
      'Guardian perception vs. youth self-report comparison',
      'K-anonymity protection (min 7 users per bucket)'
    ],
    dataProvided: [
      'Aggregate demographic distributions',
      'Equity gap analysis',
      'Population served vs. community demographics',
      'Trend data over time'
    ]
  },
  {
    id: 'wellness',
    title: 'Wellness Trends',
    subtitle: 'Aggregate mood and wellness data',
    icon: <Activity className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-sage/20 to-teal/20',
    description: 'Understand community wellness patterns through aggregated mood data. See seasonal trends, impacts of events, and overall community wellbeing.',
    features: [
      'Average mood levels over time (city-wide)',
      'Wellness dimension tracking (SAMHSA model)',
      'Mood variability and consistency indices',
      'Seasonal pattern detection',
      'Event impact analysis (e.g., exam periods)'
    ],
    dataProvided: [
      'Weekly/monthly average mood scores',
      'Check-in frequency and engagement',
      'Affect tag popularity (what emotions are common)',
      'Wellness dimension focus areas'
    ]
  },
  {
    id: 'programs',
    title: 'Program Performance',
    subtitle: 'Measure program impact',
    icon: <TrendingUp className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-teal/20 to-cosmic/20',
    description: 'Track which programs youth discover, save, and attend. Understand demand signals for new programming and optimize resource allocation.',
    features: [
      'Program discovery rates (views, saves)',
      'Attendance vs. interest comparison',
      'Category popularity rankings',
      'Geographic coverage analysis',
      'Demand signals for new programs'
    ],
    dataProvided: [
      'Top programs by views and saves',
      'Conversion rate (view → save → attend)',
      'Category demand (mental health, arts, sports, etc.)',
      'Underserved areas (geographic gaps)'
    ]
  },
  {
    id: 'compliance',
    title: 'Privacy & Compliance',
    subtitle: 'Built for Alberta law',
    icon: <Shield className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-deepSage/10 to-sage/20',
    description: 'Full Alberta PIPA/HIA compliance with audit trails, consent management, and breach notification systems. Designed for regulatory peace of mind.',
    features: [
      'Complete audit trail of all data access',
      'Consent management with timestamps',
      'Guardian verification for under-16 users',
      'OIPC breach notification system (72-hour)',
      'Data retention policies (configurable)',
      'Right to deletion and export'
    ],
    dataProvided: [
      'Consent status by category',
      'Audit log exports',
      'Guardian verification status',
      'Data retention compliance reports'
    ]
  },
  {
    id: 'reports',
    title: 'Funder Reports',
    subtitle: 'Export data for stakeholders',
    icon: <FileText className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-gold/20 to-sage/20',
    description: 'Generate reports for funders, city council, and stakeholders. All exports are privacy-protected and formatted for common reporting requirements.',
    features: [
      'CSV and JSON export options',
      'Date range filtering',
      'Customizable metrics selection',
      'Funder-ready formatting',
      'Scheduled automated reports'
    ],
    dataProvided: [
      'Youth served (unique users)',
      'Program attendance totals',
      'Engagement metrics (check-ins, conversations)',
      'Impact metrics (crisis support, program connections)'
    ]
  }
];

export default function OrganizationDemo() {
  const [expandedSection, setExpandedSection] = useState<string | null>('dashboard');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm border-b border-borderMutedLight">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-teal hover:text-teal/80 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to App</span>
          </Link>
          <Link
            to="/demos/youth"
            className="inline-flex items-center gap-2 text-deepSage hover:text-teal transition-colors text-sm"
          >
            <span>View Youth Demo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-deepSage/10 via-teal/5 to-sage/10 py-16 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-deepSage/10 rounded-full text-deepSage text-sm font-medium">
            <Building2 className="w-4 h-4" />
            <span>Organization Experience</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-display font-bold text-deepSage leading-tight">
            Room XI Connect for Organizations
          </h1>
          
          <p className="text-xl text-textSecondaryLight max-w-2xl mx-auto">
            Privacy-safe analytics, attendance tracking, and real-time insights for youth-serving organizations and city partners.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <BarChart3 className="w-4 h-4 text-teal" />
              <span>Real-Time Analytics</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <QrCode className="w-4 h-4 text-gold" />
              <span>QR Attendance</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <Lock className="w-4 h-4 text-sage" />
              <span>Privacy-Protected</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <Download className="w-4 h-4 text-coral" />
              <span>Funder Reports</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <motion.div
          className="cosmic-card p-6 bg-gradient-to-br from-teal/5 to-sage/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal/10 rounded-xl">
              <Eye className="w-6 h-6 text-teal" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-bold text-deepSage">Privacy-First Data</h3>
              <p className="text-textSecondaryLight text-sm">
                All organization-facing data is <strong>aggregated and anonymized</strong>. 
                You never see individual youth data. K-anonymity ensures minimum 7 users per data bucket. 
                Differential privacy adds mathematical noise to protect individuals.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-display font-bold text-deepSage">
            What Organizations Get
          </h2>
          <p className="text-textSecondaryLight">
            Tap any feature to see details and data provided
          </p>
        </motion.div>

        {features.map((feature, index) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.5 }}
          >
            <div
              className={`cosmic-card overflow-hidden transition-all duration-300 ${
                expandedSection === feature.id ? 'ring-2 ring-teal/30' : ''
              }`}
            >
              <button
                onClick={() => toggleSection(feature.id)}
                className="w-full p-6 flex items-center gap-4 text-left hover:bg-sage/5 transition-colors"
              >
                <div className={`p-3 rounded-xl ${feature.color}`}>
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-deepSage text-lg">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-textSecondaryLight">
                    {feature.subtitle}
                  </p>
                </div>
                <div className="text-sage">
                  {expandedSection === feature.id ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {expandedSection === feature.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pb-6 space-y-6"
                >
                  <p className="text-textSecondaryLight">
                    {feature.description}
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-deepSage flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-teal" />
                        Features
                      </h4>
                      <ul className="space-y-2">
                        {feature.features.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-textSecondaryLight">
                            <span className="text-teal mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-deepSage flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gold" />
                        Data Provided
                      </h4>
                      <ul className="space-y-2">
                        {feature.dataProvided.map((data, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-textSecondaryLight">
                            <span className="text-gold mt-1">•</span>
                            <span>{data}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}

        <motion.div
          className="cosmic-card p-6 space-y-4 bg-gradient-to-br from-gold/5 to-teal/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          <h3 className="text-lg font-display font-bold text-deepSage">
            Partnership Options for Edmonton
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-teal/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center text-teal font-bold text-sm">A</div>
                <h4 className="font-semibold text-deepSage">12-Week Pilot</h4>
              </div>
              <ul className="text-sm text-textSecondaryLight space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span>Partner with 2-3 city-affiliated programs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span><strong>Zero cost</strong> to the City of Edmonton</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span>200+ youth target over 12 weeks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span>Real-time wellness dashboards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span>Final report with recommendations</span>
                </li>
              </ul>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gold/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-sm">B</div>
                <h4 className="font-semibold text-deepSage">Directory Integration</h4>
              </div>
              <ul className="text-sm text-textSecondaryLight space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>Link on edmonton.ca/youth directory</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>"Powered by Room XI" city badge</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>Universal intake across all programs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>Shared analytics dashboard access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>Co-branded youth resources</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="cosmic-card p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <h3 className="text-xl font-display font-bold text-deepSage text-center">
            Value for Edmonton City Council
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-deepSage">Strategic Insights</h4>
              <ul className="space-y-2 text-sm text-textSecondaryLight">
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span>Citywide youth wellness trends (supports Healthy City goal)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span>Program demand signals (where to invest resources)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span>Equity gap analysis (which populations are underserved)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal">•</span>
                  <span>Crisis pattern data (for CSWB strategy alignment)</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-deepSage">Operational Benefits</h4>
              <ul className="space-y-2 text-sm text-textSecondaryLight">
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>Replace paper attendance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>Universal intake reduces redundant data collection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>Automated funder reports save staff time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">•</span>
                  <span>PIPA/HIA compliance reduces legal risk</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="cosmic-card p-8 text-center space-y-4 bg-gradient-to-br from-deepSage/5 to-teal/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <h3 className="text-xl font-display font-bold text-deepSage">
            Partner With Room XI
          </h3>
          <p className="text-textSecondaryLight max-w-md mx-auto">
            Ready to bring privacy-first youth wellness tracking to your organization or city programs?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:hello@room11foundation.org"
              className="inline-flex items-center gap-2 cosmic-button"
            >
              <Building2 className="w-4 h-4" />
              Contact for Partnership
            </a>
            <Link
              to="/demos/youth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-teal text-teal hover:bg-teal/5 transition-colors font-medium"
            >
              View Youth Demo
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="bg-gradient-to-br from-deepSage/5 via-teal/5 to-cosmic/10 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-textSecondaryLight">
            © 2025 Room 11 Foundation. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link to="/terms-of-service" className="text-teal hover:text-teal/80 transition-colors">Terms of Service</Link>
            <Link to="/privacy-policy" className="text-teal hover:text-teal/80 transition-colors">Privacy Policy</Link>
            <Link to="/about" className="text-teal hover:text-teal/80 transition-colors">About Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
