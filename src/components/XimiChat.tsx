import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Users, AlertCircle, Loader2, ChevronUp } from 'lucide-react';
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

const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
  });
};

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
    setIsLoadingHistory(true);
    try {
      const { data, error } = await api.ximi.getConversations(20, 0);
      if (error) {
        console.error('[Ximi] Failed to load conversations:', error);
        return;
      }
      if (data) {
        setMessages(data.conversations || []);
        setHasMore(data.pagination?.hasMore || false);
        setCurrentOffset(data.pagination?.limit || 20);
      }
    } catch (error) {
      console.error('[Ximi] Exception while loading conversations:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const scrollContainer = messagesContainerRef.current;
    const previousScrollHeight = scrollContainer?.scrollHeight || 0;

    try {
      const { data, error } = await api.ximi.getConversations(20, currentOffset);
      if (error) {
        console.error('[Ximi] Failed to load more conversations:', error);
        return;
      }
      if (data) {
        setMessages(prev => [...data.conversations, ...prev]);
        setHasMore(data.pagination?.hasMore || false);
        setCurrentOffset(prev => prev + (data.pagination?.limit || 20));
        
        requestAnimationFrame(() => {
          if (scrollContainer) {
            const newScrollHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = newScrollHeight - previousScrollHeight;
          }
        });
      }
    } catch (error) {
      console.error('[Ximi] Exception while loading more conversations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentOffset]);

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
          aria-label="Open Ximi chat assistant"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-500 to-teal rounded-full shadow-glow-purple flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Sparkles className="w-6 h-6 text-cream" aria-hidden="true" />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ximi-chat-title"
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
                    <h3 id="ximi-chat-title" className="text-lg font-display font-semibold text-deepSage">
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
                aria-label={`Switch to ${mode === 'sibling' ? 'Peer Guide' : 'Little Sibling'} mode. Currently in ${mode === 'sibling' ? 'Little Sibling' : 'Peer Guide'} mode`}
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
                    aria-label="Dismiss crisis warning"
                    className="p-1 hover:bg-coral/20 rounded"
                  >
                    <X className="w-4 h-4 text-textSecondaryLight" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4" 
              aria-live="polite" 
              aria-label="Chat messages"
            >
              {/* Loading History State */}
              {isLoadingHistory && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto text-purple-400 mb-3 animate-spin" />
                  <p className="text-textSecondaryLight text-sm">Loading conversation history...</p>
                </div>
              )}

              {/* Empty State */}
              {!isLoadingHistory && messages.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto text-purple-300 mb-4" />
                  <p className="text-textSecondaryLight text-sm">
                    {mode === 'sibling' 
                      ? "Hey! I'm here to chat whenever you want."
                      : "Ready to talk when you are."}
                  </p>
                </div>
              )}

              {/* Load More Button */}
              {hasMore && !isLoadingHistory && (
                <div className="text-center pb-2">
                  <button
                    onClick={loadMoreConversations}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Load older messages"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Load older messages</span>
                      </>
                    )}
                  </button>
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
                    <div className="flex flex-col items-end">
                      <div className="bg-teal/10 text-deepSage px-4 py-2 rounded-2xl rounded-tr-sm max-w-[80%]">
                        <p className="text-sm">{msg.userMessage}</p>
                      </div>
                      <span className="text-[10px] text-textSecondaryLight mt-1 mr-1">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <div className="flex items-start gap-2">
                      <div className="bg-purple-50 text-deepSage px-4 py-2 rounded-2xl rounded-tl-sm max-w-[80%]">
                        <p className="text-sm">{msg.ximiResponse}</p>
                      </div>
                      <VoiceControls
                        mode="playback"
                        getTextToSpeak={() => msg.ximiResponse}
                        className="flex-shrink-0 mt-1"
                      />
                    </div>
                    <span className="text-[10px] text-textSecondaryLight mt-1 ml-1">
                      {formatMessageTime(msg.createdAt)}
                    </span>
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
                <label htmlFor="ximi-message-input" className="sr-only">
                  Type your message to Ximi
                </label>
                <input
                  id="ximi-message-input"
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={mode === 'sibling' ? "What's on your mind?" : "What's up?"}
                  maxLength={500}
                  className="flex-1 px-4 py-2 rounded-full border-2 border-borderMutedLight focus:border-teal focus:outline-none text-sm bg-cream"
                  disabled={isSending}
                  aria-describedby="ximi-char-count"
                />
                <motion.button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending || needsGuardianVerification}
                  aria-label={isSending ? 'Sending message...' : 'Send message'}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    inputMessage.trim() && !isSending && !needsGuardianVerification
                      ? 'bg-gradient-to-br from-purple-500 to-teal text-cream'
                      : 'bg-sage/20 text-textSecondaryLight cursor-not-allowed'
                  }`}
                  whileHover={inputMessage.trim() && !isSending && !needsGuardianVerification ? { scale: 1.05 } : {}}
                  whileTap={inputMessage.trim() && !isSending && !needsGuardianVerification ? { scale: 0.95 } : {}}
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="w-4 h-4" aria-hidden="true" />
                  )}
                </motion.button>
              </div>
              <p id="ximi-char-count" className="text-xs text-textSecondaryLight text-center mt-2" aria-live="polite">
                {inputMessage.length}/500
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
