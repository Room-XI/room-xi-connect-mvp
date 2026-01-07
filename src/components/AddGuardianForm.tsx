import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Mail, User, Shield, AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import api from '@/lib/api';

export default function AddGuardianForm({ onGuardianAdded }: { onGuardianAdded?: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    guardianEmail: '',
    guardianName: '',
    guardianRole: 'secondary' as 'primary' | 'secondary' | 'emergency'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: apiError, friendlyError } = await api.auth.addGuardian(formData);
      
      if (apiError) {
        setError(friendlyError || apiError);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setFormData({
        guardianEmail: '',
        guardianName: '',
        guardianRole: 'secondary'
      });
      
      if (onGuardianAdded) {
        onGuardianAdded();
      }
      
      // Close form after delay
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add guardian');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 p-4 bg-teal/10 border border-teal/20 rounded-xl text-teal hover:bg-teal/20 transition-all group"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-semibold">Add Additional Guardian</span>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="cosmic-card p-6 border-2 border-teal/20"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-deepSage flex items-center gap-2">
              <Users className="w-5 h-5 text-teal" />
              Add Guardian
            </h3>
            <button 
              onClick={() => setShowForm(false)}
              className="p-1 hover:bg-sage/10 rounded-full"
            >
              <X className="w-5 h-5 text-textSecondaryLight" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-deepSage ml-1">Guardian Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-3 bg-sage/5 border border-sage/10 rounded-xl focus:ring-2 focus:ring-teal/50 focus:border-teal outline-none transition-all"
                  value={formData.guardianName}
                  onChange={(e) => setFormData(prev => ({ ...prev, guardianName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-deepSage ml-1">Guardian Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-sage/5 border border-sage/10 rounded-xl focus:ring-2 focus:ring-teal/50 focus:border-teal outline-none transition-all"
                  value={formData.guardianEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, guardianEmail: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-deepSage ml-1">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['primary', 'secondary', 'emergency'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, guardianRole: role }))}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      formData.guardianRole === role
                        ? 'bg-teal border-teal text-white shadow-md'
                        : 'bg-white border-sage/20 text-textSecondaryLight hover:border-teal/50'
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-coral/10 border border-coral/20 rounded-xl text-coral text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-teal/10 border border-teal/20 rounded-xl text-teal text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verification email sent successfully!</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                loading || success
                  ? 'bg-sage/20 text-textSecondaryLight cursor-not-allowed'
                  : 'bg-teal text-white hover:bg-teal/90 shadow-lg hover:shadow-teal/20'
              }`}
            >
              {loading ? (
                <Plus className="w-5 h-5 animate-spin" />
              ) : success ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              {loading ? 'Adding...' : success ? 'Sent' : 'Add Guardian & Send Link'}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
