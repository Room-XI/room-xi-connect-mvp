import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Shield, Users, ArrowLeft } from 'lucide-react';

export default function About() {
  const partners = [
    'CanManDan',
    'JumpStart',
    'Allendale Community',
    'Duggan Community',
    'YMCA of Northern Alberta',
    'OTB Basketball'
  ];

  return (
    <div className="min-h-dvh bg-cream">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-sm border-b border-borderMutedLight">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 text-teal hover:text-teal/80 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to App</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-deepSage/5 via-teal/5 to-cosmic/10 py-16 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <motion.div
            className="w-24 h-24 mx-auto bg-cosmic-gradient rounded-full flex items-center justify-center"
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <span className="text-3xl font-display font-bold text-deepSage">11</span>
          </motion.div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-deepSage leading-tight">
              Room 11 Foundation
            </h1>
            <p className="text-xl md:text-2xl text-textSecondaryLight max-w-3xl mx-auto">
              Help youth ages 13 to 25 feel seen, build capacity, and find community through creative expression, movement, and trauma-informed supports
            </p>
          </div>
        </motion.div>
      </div>

      {/* About Section */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        {/* The Challenge */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-display font-bold text-deepSage text-center">The Challenge</h2>
          <p className="text-lg text-textSecondaryLight max-w-3xl mx-auto text-center">
            Youth struggle to find trustworthy programs, track well-being, and ask for help early. 
            Staff lack simple tools to see needs and attendance without collecting invasive data. 
            Communities want privacy-respecting options that fit limited budgets.
          </p>
        </motion.div>

        {/* The Solution */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-display font-bold text-deepSage text-center">Our Solution</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-teal" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Program Discovery</h3>
              <p className="text-textSecondaryLight">
                Find safe, free local programs tailored to interests and needs
              </p>
            </div>
            
            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-cosmic/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-cosmic" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Universal Intake</h3>
              <p className="text-textSecondaryLight">
                Streamlined onboarding that respects time and privacy
              </p>
            </div>

            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-coral" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Crisis Support</h3>
              <p className="text-textSecondaryLight">
                Quick access to help when needed most, available 24/7
              </p>
            </div>
          </div>
        </motion.div>

        {/* Privacy & Design */}
        <motion.div
          className="cosmic-card p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-teal" />
            <h3 className="text-2xl font-display font-bold text-deepSage">Privacy by Design</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-textSecondaryLight">
            <div>
              <p className="font-medium text-deepSage mb-2">Youth Dignity First</p>
              <p>Minimal data collection with non-identifying XID for attendance. Clear consent, export, and deletion options.</p>
            </div>
            <div>
              <p className="font-medium text-deepSage mb-2">Accessible Design</p>
              <p>Warm, steady interface with WCAG AA standards and 44px tap targets for easy navigation.</p>
            </div>
          </div>
        </motion.div>

        {/* Who We Serve */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-3xl font-display font-bold text-deepSage text-center">Who We Serve</h2>
          <p className="text-lg text-textSecondaryLight max-w-3xl mx-auto text-center">
            Low-income, newcomer, Indigenous, racialized, and system-impacted youth in Edmonton 
            and similar cities, plus the staff who support them.
          </p>
        </motion.div>

        {/* Impact Stats */}
        <motion.div
          className="bg-gradient-to-br from-teal/5 to-cosmic/5 rounded-3xl p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center space-y-4">
            <p className="text-5xl font-display font-bold text-deepSage">570+</p>
            <p className="text-xl text-textSecondaryLight">Youth served across local programs and pilots</p>
          </div>
        </motion.div>

        {/* Partners */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl font-display font-bold text-deepSage text-center">Our Partners</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {partners.map((partner, index) => (
              <motion.div
                key={partner}
                className="cosmic-card p-4 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <p className="text-sm font-medium text-deepSage">{partner}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Legal Compliance */}
        <motion.div
          className="cosmic-card p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <h3 className="text-2xl font-display font-bold text-deepSage">Legal Compliance</h3>
          <div className="space-y-4 text-textSecondaryLight">
            <p>
              Room 11 Foundation is a federally incorporated non-profit organization operating under Alberta's Personal Information Protection Act (PIPA) and Health Information Act (HIA).
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Youth aged 13+ can provide meaningful consent for services</li>
              <li>Optional guardian verification for added trust (under 18)</li>
              <li>Health data requires separate HIA-compliant consent</li>
              <li>Complete audit trail for all consent changes</li>
              <li>Breach notification system with 72-hour OIPC reporting</li>
              <li>Indigenous data sovereignty (OCAP principles)</li>
            </ul>
          </div>
        </motion.div>

        {/* Contact & Donate */}
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h2 className="text-3xl font-display font-bold text-deepSage">Support Our Work</h2>
          <p className="text-lg text-textSecondaryLight max-w-2xl mx-auto">
            Your support helps us build safe spaces and opportunities for youth across Edmonton.
          </p>
          <motion.a
            href="https://www.zeffy.com/en-CA/donation-form/build-the-room-xi-youth-hub-in-edmonton"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 cosmic-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Heart className="w-5 h-5" />
            <span>Donate to Room 11</span>
          </motion.a>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-br from-deepSage/5 via-teal/5 to-cosmic/10 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <p className="text-textSecondaryLight">
            © 2025 Room 11 Foundation. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href="#" className="text-teal hover:text-teal/80 transition-colors">Terms of Service</a>
            <a href="#" className="text-teal hover:text-teal/80 transition-colors">Privacy Policy</a>
            <a href="#" className="text-teal hover:text-teal/80 transition-colors">Contact Us</a>
          </div>
        </div>
      </div>
    </div>
  );
}
