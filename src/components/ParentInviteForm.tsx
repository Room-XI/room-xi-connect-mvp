import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Check, AlertCircle, Loader } from 'lucide-react';
import api from '@/lib/api';

export default function ParentInviteForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: apiError } = await api.parentAuth.sendInvite(email);

      if (apiError) {
        throw new Error(apiError);
      }

      setSent(true);
      setEmail('');
      
      setTimeout(() => {
        setSent(false);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to send parent invite:', err);
      setError(err.message || 'Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="cosmic-card p-6"
      >
        <div className="flex items-center space-x-3 text-teal">
          <Check className="w-6 h-6" />
          <div>
            <h3 className="font-semibold text-deepSage">Invitation Sent!</h3>
            <p className="text-sm text-textSecondaryLight">
              Your parent/guardian will receive an email with a link to accept the invitation.
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
        <Mail className="w-5 h-5 text-teal" />
        <h3 className="font-semibold text-deepSage">Invite Parent/Guardian</h3>
      </div>

      <p className="text-sm text-textSecondaryLight">
        Send an invitation to your parent or guardian to manage consent and view your program participation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="parent-email" className="block text-sm font-medium text-deepSage mb-2">
            Parent/Guardian Email
          </label>
          <input
            id="parent-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@example.com"
            className="w-full px-4 py-2 border border-sage/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/50 bg-white text-deepSage"
            disabled={loading}
            required
          />
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

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              <span>Send Invitation</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-sage/20">
        <p className="text-xs text-textSecondaryLight">
          <strong>Privacy Note:</strong> The invitation will be sent via email and expires in 30 days. 
          Your parent/guardian can manage consent and view program participation, but cannot access your mood check-ins or AI conversations.
        </p>
      </div>
    </motion.div>
  );
}
