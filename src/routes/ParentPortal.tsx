import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, LogOut, Loader, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import ParentConsentManager from '@/components/ParentConsentManager';

interface LinkedYouth {
  userId: string;
  relation: string;
  verifiedAt: string | null;
  preferredName: string | null;
  firstName: string | null;
  age: number | null;
}

export default function ParentPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linkedYouth, setLinkedYouth] = useState<LinkedYouth[]>([]);
  const [selectedYouth, setSelectedYouth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadParentStatus();
  }, []);

  const loadParentStatus = async () => {
    try {
      setLoading(true);
      const { data, error: apiError } = await api.parentAuth.getStatus();

      if (apiError) {
        throw new Error(apiError);
      }

      if (data?.linkedYouth) {
        setLinkedYouth(data.linkedYouth);
        if (data.linkedYouth.length > 0) {
          setSelectedYouth(data.linkedYouth[0].userId);
        }
      }
    } catch (err: any) {
      console.error('Failed to load parent status:', err);
      setError(err.message || 'Failed to load youth information');
      
      if (err.message?.includes('401') || err.message?.includes('authentication')) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.parentAuth.logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-teal" />
      </div>
    );
  }

  if (error || linkedYouth.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cosmic-card p-8 max-w-md text-center space-y-4"
        >
          <Shield className="w-12 h-12 text-coral mx-auto" />
          <h2 className="text-2xl font-display font-bold text-deepSage">
            No Linked Youth
          </h2>
          <p className="text-textSecondaryLight">
            {error || 'You do not have any linked youth accounts. Please accept an invitation from a youth to get started.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  const selectedYouthData = linkedYouth.find((y) => y.userId === selectedYouth);
  const youthName = selectedYouthData?.preferredName || selectedYouthData?.firstName || 'Youth';

  return (
    <div className="min-h-screen bg-gradient-cosmic">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-teal/10 rounded-lg">
                <Shield className="w-6 h-6 text-teal" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-deepSage">
                  Parent Portal
                </h1>
                <p className="text-sm text-textSecondaryLight">
                  Manage consent and view program participation
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-coral/10 text-coral rounded-lg hover:bg-coral/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </motion.div>

        {/* Linked Youth Selector */}
        {linkedYouth.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="cosmic-card p-4 mb-6"
          >
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-4 h-4 text-teal" />
              <span className="text-sm font-medium text-deepSage">Select Youth</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {linkedYouth.map((youth) => (
                <button
                  key={youth.userId}
                  onClick={() => setSelectedYouth(youth.userId)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedYouth === youth.userId
                      ? 'bg-teal text-white'
                      : 'bg-sage/10 text-deepSage hover:bg-sage/20'
                  }`}
                >
                  {youth.preferredName || youth.firstName || 'Youth'}
                  {youth.age && ` (${youth.age})`}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Current Youth Info */}
        {selectedYouthData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="cosmic-card p-6 mb-6"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gold/10 rounded-lg">
                <Heart className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-deepSage">{youthName}</h2>
                <p className="text-sm text-textSecondaryLight">
                  {selectedYouthData.relation === 'guardian' ? 'Guardian' : 'Parent'} •
                  Linked {selectedYouthData.verifiedAt && new Date(selectedYouthData.verifiedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Consent Manager */}
        {selectedYouth && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ParentConsentManager userId={selectedYouth} youthName={youthName} />
          </motion.div>
        )}

        {/* Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center text-sm text-textSecondaryLight"
        >
          <p>
            <strong>Privacy Note:</strong> You can manage consent and view program participation,
            but cannot access mood check-ins or AI conversations.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
