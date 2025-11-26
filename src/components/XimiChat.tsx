import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Users, AlertCircle } from 'lucide-react';
import api, { type ProgramRecommendation, type MoodTrendData } from '@/lib/api';
import { useSession } from '@/lib/session';
import VoiceControls from '@/components/VoiceControls';
import ProgramRecommendations from '@/components/ProgramRecommendations';

interface Message {
  id: string;
  userMessage?: string;
  ximiResponse: string;
  createdAt: string;
  crisisDetected?: boolean;
}

interface XimiChatProps {
  isEnabled?: boolean;
  onConsentRequired?: () => void;
}

export default function XimiChat({ isEnabled = true, onConsentRequired }: XimiChatProps) {
  const { needsGuardianVerification } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<'sibling' | 'peer'>('sibling');
  const [showCrisisWarning, setShowCrisisWarning] = useState(false);
  const [recommendations, setRecommendations] = useState<ProgramRecommendation[]>([]);
  const [moodTrend, setMoodTrend] = useState<MoodTrendData | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      loadRecommendations();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    
    try {
      const [trendsResult, recsResult] = await Promise.all([
        api.ximi.getTrends('week'),
        api.ximi.getRecommendations({ includeTrends: true }),
      ]);

      if (trendsResult.data) {
        setMoodTrend(trendsResult.data);
      }

      if (recsResult.data?.recommendations) {
        setRecommendations(recsResult.data.recommendations);
      }
    } catch (error) {
      console.error('[Ximi] Exception while loading recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await api.ximi.getConversations();
      if (error) {
        console.error('[Ximi] Failed to load conversations:', error);
        return;
      }
      setMessages(data || []);
    } catch (error) {
      console.error('[Ximi] Exception while loading conversations:', error);
    }
  };

  const handleAppendTranscript = (text: string) => {
    setInputMessage(prev => prev + text);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      const { data, error } = await api.ximi.chat({
        message: userMsg,
      });

      if (error) {
        if (error === 'Ximi consent required') {
          onConsentRequired?.();
          return;
        }
        console.error('[Ximi] Chat request failed:', error);
        return;
      }

      if (data.crisisDetected) {
        console.warn('[Ximi] Crisis detected in response');
        setShowCrisisWarning(true);
      }

      setMessages(prev => [...prev, data]);
    } catch (error) {
      console.error('[Ximi] Exception during chat request:', error);
    } finally {
      setIsSending(false);
    }
  };

  const toggleMode = async () => {
    const newMode = mode === 'sibling' ? 'peer' : 'sibling';
    
    try {
      const { error } = await api.ximi.toggleMode(newMode);

      if (error) {
        console.error('[Ximi] Failed to toggle mode:', error);
      } else {
        setMode(newMode);
      }
    } catch (error) {
      console.error('[Ximi] Exception during mode toggle:', error);
    }
  };

  if (!isEnabled) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-500 to-teal rounded-full shadow-glow-purple flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Sparkles className="w-6 h-6 text-cream" />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 w-full max-w-md h-[600px] bg-surface border-2 border-borderMutedLight rounded-2xl shadow-xl flex flex-col overflow-hidden"
            initial={{ scale: 0, opacity: 0, transformOrigin: 'bottom right' }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-borderMutedLight bg-gradient-to-r from-purple-50 to-teal/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cream" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-semibold text-deepSage">
                      Ximi
                    </h3>
                    <p className="text-xs text-textSecondaryLight">
                      {mode === 'sibling' ? 'Little Sibling' : 'Peer Guide'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5 text-textSecondaryLight" />
                </button>
              </div>

              {/* Mode Toggle */}
              <button
                onClick={toggleMode}
                className="mt-3 w-full p-2 rounded-lg bg-surface border border-borderMutedLight hover:border-teal transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                {mode === 'sibling' ? (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-deepSage">Little Sibling Mode</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-teal" />
                    <span className="text-deepSage">Peer Guide Mode</span>
                  </>
                )}
                <span className="text-xs text-textSecondaryLight ml-auto">Tap to switch</span>
              </button>
            </div>

            {/* Persistent Disclaimer Banner */}
            <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200/50">
              <p className="text-xs text-amber-800 text-center">
                <span className="font-medium">Reminder:</span> Ximi is an AI companion, not a licensed clinician. For professional mental health support, please contact a counselor or crisis line.
              </p>
            </div>

            {/* Guardian Verification Warning */}
            {needsGuardianVerification && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-amber-50 border-b border-amber-200 p-3"
              >
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-900 font-medium">
                      Guardian Verification Required
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      A parent or guardian needs to verify your account before you can chat with Ximi.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Crisis Warning */}
            {showCrisisWarning && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-coral/10 border-b border-coral/20 p-3"
              >
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-deepSage font-medium">
                      Need immediate help?
                    </p>
                    <p className="text-xs text-textSecondaryLight mt-1">
                      Kids Help Phone: 1-800-668-6868 or text CONNECT to 686868
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCrisisWarning(false)}
                    className="p-1 hover:bg-coral/20 rounded"
                  >
                    <X className="w-4 h-4 text-textSecondaryLight" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto text-purple-300 mb-4" />
                  <p className="text-textSecondaryLight text-sm">
                    {mode === 'sibling' 
                      ? "Hey! I'm here to chat whenever you want."
                      : "Ready to talk when you are."}
                  </p>
                </div>
              )}

              {/* Recommendations Section */}
              {recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="border-t border-borderMutedLight pt-4"
                >
                  <ProgramRecommendations
                    recommendations={recommendations}
                    title={moodTrend ? `Programs for you (based on your ${moodTrend.dominantMood || 'recent'} mood)` : 'Recommended Programs'}
                  />
                </motion.div>
              )}

              {/* Loading State for Recommendations */}
              {loadingRecommendations && recommendations.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-purple-50/30 border border-borderMutedLight rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-textSecondaryLight">Loading personalized recommendations...</p>
                  </div>
                </motion.div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  {msg.userMessage && (
                    <div className="flex justify-end">
                      <div className="bg-teal/10 text-deepSage px-4 py-2 rounded-2xl rounded-tr-sm max-w-[80%]">
                        <p className="text-sm">{msg.userMessage}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-start items-start gap-2">
                    <div className="bg-purple-50 text-deepSage px-4 py-2 rounded-2xl rounded-tl-sm max-w-[80%]">
                      <p className="text-sm">{msg.ximiResponse}</p>
                    </div>
                    <VoiceControls
                      mode="playback"
                      getTextToSpeak={() => msg.ximiResponse}
                      className="flex-shrink-0 mt-1"
                    />
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-borderMutedLight bg-surface">
              <div className="mb-3">
                <VoiceControls
                  mode="input"
                  onAppendTranscript={handleAppendTranscript}
                  className="mb-2"
                />
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={mode === 'sibling' ? "What's on your mind?" : "What's up?"}
                  maxLength={500}
                  className="flex-1 px-4 py-2 rounded-full border-2 border-borderMutedLight focus:border-teal focus:outline-none text-sm bg-cream"
                  disabled={isSending}
                />
                <motion.button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending || needsGuardianVerification}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    inputMessage.trim() && !isSending && !needsGuardianVerification
                      ? 'bg-gradient-to-br from-purple-500 to-teal text-cream'
                      : 'bg-sage/20 text-textSecondaryLight cursor-not-allowed'
                  }`}
                  whileHover={inputMessage.trim() && !isSending && !needsGuardianVerification ? { scale: 1.05 } : {}}
                  whileTap={inputMessage.trim() && !isSending && !needsGuardianVerification ? { scale: 0.95 } : {}}
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
              <p className="text-xs text-textSecondaryLight text-center mt-2">
                {inputMessage.length}/500
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
