import { useState } from 'react';
import { Phone, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FloatingCrisisButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-coral text-white rounded-full shadow-lg flex items-center justify-center hover:bg-coral/90 transition-all"
        aria-label="Crisis support"
      >
        <Phone className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-deepSage flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-coralText" />
                  Crisis Support
                </h2>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-textSecondaryLight">
                If you're in crisis or need immediate help, reach out now. You're not alone.
              </p>

              <div className="space-y-3">
                <a
                  href="tel:988"
                  className="flex items-center gap-3 p-4 bg-coral/10 rounded-xl hover:bg-coral/20 transition"
                >
                  <Phone className="w-5 h-5 text-coralText" />
                  <div>
                    <div className="font-semibold text-deepSage">988 Suicide & Crisis Lifeline</div>
                    <div className="text-sm text-textSecondaryLight">Call or text 988</div>
                  </div>
                </a>

                <a
                  href="https://www.crisisservicescanada.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-teal/10 rounded-xl hover:bg-teal/20 transition"
                >
                  <ExternalLink className="w-5 h-5 text-teal" />
                  <div>
                    <div className="font-semibold text-deepSage">Crisis Services Canada</div>
                    <div className="text-sm text-textSecondaryLight">1-833-456-4566 (24/7)</div>
                  </div>
                </a>

                <a
                  href="sms:686868&body=CONNECT"
                  className="flex items-center gap-3 p-4 bg-sage/10 rounded-xl hover:bg-sage/20 transition"
                >
                  <Phone className="w-5 h-5 text-sage" />
                  <div>
                    <div className="font-semibold text-deepSage">Kids Help Phone</div>
                    <div className="text-sm text-textSecondaryLight">Text CONNECT to 686868</div>
                  </div>
                </a>
              </div>

              <button
                onClick={() => {
                  window.location.href = 'https://www.google.com';
                }}
                className="w-full p-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Quick Exit
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
