import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Shield, Eye, Brain } from 'lucide-react';
import api from '@/lib/api';

interface XimiConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentGranted: () => void;
}

export default function XimiConsentModal({ isOpen, onClose, onConsentGranted }: XimiConsentModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      const { error } = await api.ximi.setConsent(true);
      
      if (error) {
        console.error('Error granting consent:', error);
        alert('Failed to enable Ximi. Please try again.');
        return;
      }

      onConsentGranted();
      onClose();
    } catch (error) {
      console.error('Unexpected error granting consent:', error);
      alert('Failed to enable Ximi. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDecline}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-cream rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-br from-purple-500 to-teal p-6 text-cream">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-cream/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Meet Ximi</h2>
                      <p className="text-sm text-cream/80">Your AI Wellness Companion</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDecline}
                    className="p-2 hover:bg-cream/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* What is Ximi */}
                <div>
                  <h3 className="font-semibold text-deepSage mb-3">What is Ximi?</h3>
                  <p className="text-sm text-textSecondaryLight leading-relaxed">
                    Ximi is your personal AI companion designed to support your mental wellness journey. 
                    Ximi can chat with you about your feelings, provide supportive responses, and help you 
                    reflect on your mood and wellness.
                  </p>
                </div>

                {/* How It Works */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-deepSage">How Ximi Works</h3>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-deepSage">AI-Powered Conversations</p>
                      <p className="text-sm text-textSecondaryLight">
                        Ximi uses artificial intelligence to understand and respond to your messages in a supportive, 
                        trauma-informed way.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-deepSage">Crisis Detection</p>
                      <p className="text-sm text-textSecondaryLight">
                        Ximi monitors conversations for crisis keywords and will provide immediate crisis resources 
                        when needed.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-sage-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-sage-600" />
                    </div>
                    <div>
                      <p className="font-medium text-deepSage">Privacy-First Design</p>
                      <p className="text-sm text-textSecondaryLight">
                        Your conversations are stored securely and only used to improve your experience. 
                        We never share your data with third parties.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Important to Know */}
                <div className="bg-gold/10 border border-gold/20 rounded-lg p-4">
                  <h3 className="font-semibold text-deepSage mb-2">Important to Know</h3>
                  <ul className="text-sm text-textSecondaryLight space-y-2">
                    <li className="flex items-start">
                      <span className="text-gold mr-2">•</span>
                      <span>Ximi is an AI and not a replacement for professional mental health support</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gold mr-2">•</span>
                      <span>Your conversations are saved to help Ximi provide better support over time</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gold mr-2">•</span>
                      <span>Ximi uses OpenAI's technology to generate responses</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gold mr-2">•</span>
                      <span>You can disable Ximi anytime in Settings</span>
                    </li>
                  </ul>
                </div>

                {/* Consent Statement */}
                <div className="bg-sage/5 rounded-lg p-4 border border-sage/10">
                  <p className="text-sm text-textSecondaryLight leading-relaxed">
                    By enabling Ximi, you consent to:
                  </p>
                  <ul className="text-sm text-textSecondaryLight space-y-1 mt-2 ml-4">
                    <li>• AI-generated conversations based on your messages</li>
                    <li>• Storage of conversation history for personalization</li>
                    <li>• Processing of messages through OpenAI's API</li>
                    <li>• Automated crisis keyword detection for your safety</li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 bg-sage/5 border-t border-sage/10 flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={handleDecline}
                  disabled={isAccepting}
                  className="flex-1 px-6 py-3 rounded-full border-2 border-sage/20 text-deepSage font-medium hover:bg-sage/5 transition-colors disabled:opacity-50"
                >
                  Not Now
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="flex-1 px-6 py-3 rounded-full bg-gradient-to-br from-purple-500 to-teal text-cream font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAccepting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin mr-2" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Enable Ximi
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
