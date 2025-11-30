import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight,
  Heart, 
  MapPin, 
  MessageCircle, 
  Shield, 
  Phone,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface FeatureSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  features: string[];
  howItWorks: string[];
}

const features: FeatureSection[] = [
  {
    id: 'mood-checkin',
    title: 'Daily Mood Check-ins',
    subtitle: '30 seconds to track your wellness',
    icon: <Heart className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-coral/20 to-gold/20',
    description: 'A gentle daily practice to understand how you\'re feeling. Your mood history creates a beautiful visual "Mood Orb" that shows your week at a glance.',
    features: [
      '6-level mood scale (1 = struggling, 6 = thriving)',
      'Affect tags to describe your emotions',
      'Optional notes for reflection',
      'Streak tracking to build healthy habits',
      '7-day Mood Orb visualization',
      'Export your Mood Orb as an image'
    ],
    howItWorks: [
      'Tap the Mood Orb on your home screen',
      'Select how you\'re feeling on the 1-6 scale',
      'Choose emotion tags that resonate with you',
      'Add an optional note about your day',
      'Watch your Mood Orb evolve over time'
    ]
  },
  {
    id: 'programs',
    title: 'Program Discovery',
    subtitle: '75+ Edmonton youth programs',
    icon: <MapPin className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-teal/20 to-sage/20',
    description: 'Find free, safe local programs tailored to your interests. Mental health, arts, sports, employment, LGBTQ+ support, Indigenous programs, and more.',
    features: [
      'Search by category, location, or what\'s happening today',
      'Filter by age, cost, drop-in vs. scheduled',
      'Save programs for later',
      '"Today" tab shows what\'s happening right now',
      'Map view to find programs near you',
      'Direct contact info for each program'
    ],
    howItWorks: [
      'Tap "Explore" to browse all programs',
      'Use the "Today" tab to see what\'s happening now',
      'Filter by category or use the search bar',
      'Tap any program for full details',
      'Save programs to your list for later'
    ]
  },
  {
    id: 'ximi',
    title: 'Ximi AI Companion',
    subtitle: '24/7 supportive chat companion',
    icon: <MessageCircle className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-cosmic/20 to-teal/20',
    description: 'Ximi is a trauma-informed AI companion available anytime you need to talk. Ximi offers supportive conversation, coping strategies, and connects you to real resources.',
    features: [
      'Available 24/7 whenever you need support',
      'Two modes: Sibling (casual) or Professional (counselor-like)',
      'Suggests coping strategies based on how you\'re feeling',
      'Connects you to crisis resources when needed',
      'Never judges, always supportive'
    ],
    howItWorks: [
      'Tap the chat bubble on any screen',
      'Share what\'s on your mind',
      'Ximi responds with supportive guidance',
      'If you\'re in crisis, Ximi connects you to help immediately'
    ]
  },
  {
    id: 'crisis',
    title: 'Crisis Support',
    subtitle: 'Immediate help when you need it',
    icon: <Phone className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-coral/20 to-rose-200',
    description: 'Quick access to crisis resources, available 24/7 without needing to log in. One-tap calling to Kids Help Phone, distress lines, and local supports.',
    features: [
      'Kids Help Phone: 1-800-668-6868',
      'CMHA Distress Line: 780-482-4357',
      '211 Alberta for service navigation',
      'One-tap calling to any crisis line',
      'Available even without an account'
    ],
    howItWorks: [
      'Tap "Crisis Support" from any screen',
      'See all available crisis resources',
      'One tap to call or text any service',
      'Available 24/7, no login required'
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy Controls',
    subtitle: 'You control your data',
    icon: <Shield className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-sage/20 to-teal/20',
    description: 'Built for Alberta privacy law (PIPA). You decide what to share, can export your data anytime, and delete your account whenever you want.',
    features: [
      'Granular consent toggles (all default OFF)',
      'Export all your data as JSON',
      'Delete your account and all data anytime',
      'Your demographics are never shared with parents',
      'No advertisers, no data selling, ever',
      'Monthly consent review reminders'
    ],
    howItWorks: [
      'Visit Privacy Center in Settings',
      'Toggle individual permissions on/off',
      'Export or delete your data anytime',
      'Review and update consents monthly'
    ]
  },
  {
    id: 'attendance',
    title: 'QR Attendance',
    subtitle: 'Check in to programs paperlessly',
    icon: <Calendar className="w-8 h-8" />,
    color: 'bg-gradient-to-br from-gold/20 to-coral/20',
    description: 'One signup works across all programs. Scan a QR code when you arrive at a program - no paper forms, no repeating your info.',
    features: [
      'Universal intake: sign up once, attend anywhere',
      'Scan QR codes at program locations',
      'Track which programs you\'ve attended',
      'Privacy-preserving (uses anonymous ID)'
    ],
    howItWorks: [
      'Program staff shows you a QR code',
      'Open the QR scanner in the app',
      'Scan the code to check in',
      'You\'re done - no paperwork!'
    ]
  }
];

export default function YouthDemo() {
  const [expandedSection, setExpandedSection] = useState<string | null>('mood-checkin');

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
            to="/demos/organization"
            className="inline-flex items-center gap-2 text-deepSage hover:text-teal transition-colors text-sm"
          >
            <span>View Organization Demo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-teal/10 via-cosmic/5 to-gold/10 py-16 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal/10 rounded-full text-teal text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Youth Experience</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-display font-bold text-deepSage leading-tight">
            Room XI Connect
          </h1>
          
          <p className="text-xl text-textSecondaryLight max-w-2xl mx-auto">
            Your personal wellness companion. Check in daily, discover programs, chat with Ximi, and access crisis support whenever you need it.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <Heart className="w-4 h-4 text-coral" />
              <span>Daily Check-ins</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <MapPin className="w-4 h-4 text-teal" />
              <span>75+ Programs</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <MessageCircle className="w-4 h-4 text-cosmic" />
              <span>24/7 AI Support</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <Shield className="w-4 h-4 text-sage" />
              <span>Privacy-First</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-display font-bold text-deepSage">
            What You'll Get
          </h2>
          <p className="text-textSecondaryLight">
            Tap any feature to learn more
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
                        <Star className="w-4 h-4 text-gold" />
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
                        <ArrowRight className="w-4 h-4 text-teal" />
                        How It Works
                      </h4>
                      <ol className="space-y-2">
                        {feature.howItWorks.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-textSecondaryLight">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal/10 text-teal text-xs flex items-center justify-center font-medium">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}

        <motion.div
          className="cosmic-card p-6 space-y-4 bg-gradient-to-br from-deepSage/5 to-sage/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <MapPin className="w-5 h-5 text-gold" />
            </div>
            <h3 className="font-display font-bold text-deepSage">
              Edmonton Partnership
            </h3>
          </div>
          <p className="text-sm text-textSecondaryLight">
            Room XI Connect aligns with ConnectEdmonton's <strong>Healthy City</strong> goal and supports the 
            Community Safety & Well-Being Strategy. We're proposing a 12-week pilot with 2-3 city-affiliated programs.
          </p>
          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-teal/5 rounded-lg">
              <h4 className="font-semibold text-teal text-sm mb-2">Option A: Pilot Program</h4>
              <ul className="text-xs text-textSecondaryLight space-y-1">
                <li>• 12-week pilot with 2-3 programs</li>
                <li>• Zero cost to the city</li>
                <li>• Real-time wellness data</li>
              </ul>
            </div>
            <div className="p-4 bg-gold/5 rounded-lg">
              <h4 className="font-semibold text-gold text-sm mb-2">Option B: Integration</h4>
              <ul className="text-xs text-textSecondaryLight space-y-1">
                <li>• Link on edmonton.ca/youth</li>
                <li>• "Powered by Room XI" badge</li>
                <li>• Universal youth intake</li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="cosmic-card p-8 text-center space-y-4 bg-gradient-to-br from-teal/5 to-cosmic/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          <h3 className="text-xl font-display font-bold text-deepSage">
            Ready to Start?
          </h3>
          <p className="text-textSecondaryLight max-w-md mx-auto">
            Join 570+ youth already using Room XI Connect to track their wellness and discover programs in Edmonton.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/auth/signup"
              className="inline-flex items-center gap-2 cosmic-button"
            >
              <Sparkles className="w-4 h-4" />
              Sign Up Free
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-teal text-teal hover:bg-teal/5 transition-colors font-medium"
            >
              Log In
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
