import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Phone, MessageCircle, AlertCircle } from 'lucide-react';
import useFocusTrap from '@/hooks/useFocusTrap';

interface CrisisDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

/**
 * Crisis Detection Modal
 * Automatically shown when crisis keywords are detected in check-in notes or Ximi conversations
 * Routes youth to Safety Resources page with immediate crisis support
 */
export default function CrisisDetectionModal({ isOpen, onClose, message }: CrisisDetectionModalProps) {
  const navigate = useNavigate();
  const focusTrapRef = useFocusTrap(isOpen);

  useEffect(() => {
    // Auto-focus on the modal for accessibility
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleViewResources = () => {
    onClose();
    navigate('/safety-resources');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div ref={focusTrapRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="crisis-modal-title">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
        >
          {/* Header with heart icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 id="crisis-modal-title" className="text-2xl font-bold text-gray-900">You're Not Alone</h2>
              <p className="text-sm text-gray-600">Help is available right now</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-lg mb-6">
              <p className="text-sm text-rose-900">{message}</p>
            </div>
          )}

          {/* Emergency notice */}
          <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">If you're in immediate danger</p>
                <p className="text-red-800 text-sm">Call 911 or go to your nearest emergency room</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-3 mb-6">
            <a
              href="tel:1-800-668-6868"
              className="flex items-center gap-3 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              <Phone className="w-6 h-6" />
              <div className="text-left">
                <p className="font-bold">Kids Help Phone</p>
                <p className="text-sm opacity-90">1-800-668-6868 (24/7)</p>
              </div>
            </a>

            <button
              onClick={() => {
                window.location.href = 'sms:686868?body=CONNECT';
              }}
              className="flex items-center gap-3 w-full bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
            >
              <MessageCircle className="w-6 h-6" />
              <div className="text-left">
                <p className="font-bold">Text CONNECT to 686868</p>
                <p className="text-sm opacity-90">Free crisis support by text</p>
              </div>
            </button>
          </div>

          {/* View all resources */}
          <button
            onClick={handleViewResources}
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700 transition-colors mb-3"
          >
            View All Crisis Support Resources
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full text-gray-600 hover:text-gray-900 py-3 rounded-lg font-medium transition-colors min-h-[44px]"
          >
            Close
          </button>

          {/* Footer message */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              You deserve support. Reaching out is a sign of strength, not weakness.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
