import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MessageSquare, MapPin, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CrisisSheetProps {
  open: boolean;
  onClose: () => void;
}

interface CrisisSupport {
  id: string;
  region: string;
  category: 'call' | 'textchat' | 'inperson';
  name: string;
  phone?: string;
  text_code?: string;
  chat_url?: string;
  address?: string;
  hours?: string;
  notes?: string;
}

export default function CrisisSheet({ open, onClose }: CrisisSheetProps) {
  const [supports, setSupports] = useState<CrisisSupport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadCrisisSupports();
    }
  }, [open]);

  const loadCrisisSupports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crisis_supports')
        .select('*')
        .order('region', { ascending: true })
        .order('category', { ascending: true });

      if (error) {
        console.error('Error loading crisis supports:', error);
        return;
      }

      setSupports(data || []);
    } catch (error) {
      console.error('Unexpected error loading crisis supports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleText = (phone: string, code?: string) => {
    if (code) {
      window.location.href = `sms:${phone}?body=${encodeURIComponent(code)}`;
    } else {
      window.location.href = `sms:${phone}`;
    }
  };

  const handleChat = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const groupedSupports = supports.reduce((acc, support) => {
    if (!acc[support.category]) {
      acc[support.category] = [];
    }
    acc[support.category].push(support);
    return acc;
  }, {} as Record<string, CrisisSupport[]>);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-navy/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        {/* Sheet */}
        <motion.div
          className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl border-t border-borderMutedLight max-h-[90vh] overflow-y-auto"
          initial={{ transform: 'translateY(100%)' }}
          animate={{ transform: 'translateY(0)' }}
          exit={{ transform: 'translateY(100%)' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-deepSage">
                Crisis Support
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                aria-label="Close crisis support"
              >
                <X className="w-5 h-5 text-textSecondaryLight" />
              </button>
            </div>
            
            {/* Emergency Notice */}
            <div className="bg-coral/10 border border-coral/20 rounded-xl p-4">
              <p className="text-sm font-medium text-coral">
                <strong>In immediate danger?</strong> Call 911 or go to your nearest emergency room.
              </p>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Call Support */}
                {groupedSupports.call && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-deepSage flex items-center space-x-2">
                      <Phone className="w-5 h-5 text-coral" />
                      <span>Call for Support</span>
                    </h3>
                    <div className="space-y-3">
                      {groupedSupports.call.map(support => (
                        <motion.button
                          key={support.id}
                          onClick={() => support.phone && handleCall(support.phone)}
                          className="w-full bg-coral text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 hover:bg-coral/90 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <div className="font-bold">{support.name}</div>
                              <div className="text-sm opacity-90">{support.phone}</div>
                              {support.hours && (
                                <div className="text-xs opacity-75">{support.hours}</div>
                              )}
                            </div>
                            <Phone className="w-6 h-6" />
                          </div>
                          {support.notes && (
                            <div className="text-xs opacity-75 mt-2 text-left">
                              {support.notes}
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Text/Chat Support */}
                {groupedSupports.textchat && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-deepSage flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-teal" />
                      <span>Text or Chat</span>
                    </h3>
                    <div className="space-y-3">
                      {groupedSupports.textchat.map(support => (
                        <div key={support.id} className="cosmic-card p-4 space-y-3">
                          <div className="font-semibold text-deepSage">{support.name}</div>
                          {support.hours && (
                            <div className="text-sm text-textSecondaryLight">{support.hours}</div>
                          )}
                          <div className="flex flex-col space-y-2">
                            {support.phone && (
                              <motion.button
                                onClick={() => handleText(support.phone!, support.text_code)}
                                className="teal-button flex items-center justify-center space-x-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>
                                  Text {support.phone}
                                  {support.text_code && ` (${support.text_code})`}
                                </span>
                              </motion.button>
                            )}
                            {support.chat_url && (
                              <motion.button
                                onClick={() => handleChat(support.chat_url!)}
                                className="ghost-button flex items-center justify-center space-x-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>Live Chat</span>
                              </motion.button>
                            )}
                          </div>
                          {support.notes && (
                            <div className="text-sm text-textSecondaryLight">
                              {support.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* In-Person Support */}
                {groupedSupports.inperson && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-deepSage flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-gold" />
                      <span>In-Person Support</span>
                    </h3>
                    <div className="space-y-3">
                      {groupedSupports.inperson.map(support => (
                        <div key={support.id} className="cosmic-card p-4">
                          <div className="font-semibold text-deepSage">{support.name}</div>
                          {support.address && (
                            <div className="text-sm text-textSecondaryLight mt-1">
                              {support.address}
                            </div>
                          )}
                          {support.hours && (
                            <div className="text-sm text-textSecondaryLight mt-1">
                              {support.hours}
                            </div>
                          )}
                          {support.notes && (
                            <div className="text-sm text-textSecondaryLight mt-2">
                              {support.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Footer */}
            <div className="text-center text-xs text-textSecondaryLight pt-4 border-t border-borderMutedLight">
              You are not alone. Help is available 24/7.
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
