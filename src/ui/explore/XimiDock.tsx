import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, MapPin } from 'lucide-react';
import api, { type ProgramRecommendation } from '@/lib/api';
import XimiConsentModal from '@/components/XimiConsentModal';
import VoiceControls from '@/components/VoiceControls';
import EventCard from '@/components/EventCard';

interface XimiDockProps {
  onCrisis: () => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function XimiDock({ onCrisis }: XimiDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Ximi, your AI companion. I can help you find programs, answer questions about mental health resources, or just chat. What's on your mind?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recommendations, setRecommendations] = useState<ProgramRecommendation[]>([]);
  const [hasNewRecommendations, setHasNewRecommendations] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [prioritizeNearby, setPrioritizeNearby] = useState(false);

  // Request user location on component mount
  useEffect(() => {
    requestUserLocation();
  }, []);

  // Load conversation history and recommendations when location is ready
  useEffect(() => {
    const loadConversationHistory = async () => {
      try {
        const { data, error } = await api.ximi.getConversations();
        
        if (error) {
          console.error('[Ximi Client] Failed to load conversation history:', {
            timestamp: new Date().toISOString(),
            error: typeof error === 'string' ? error : error,
            userAuthenticated: true,
          });
          return;
        }

        if (data && data.length > 0) {
          // Convert API conversations to Message format
          const historyMessages: Message[] = [];
          
          data.forEach((conv: any) => {
            // Add user message
            historyMessages.push({
              id: `${conv.id}-user`,
              text: conv.userMessage,
              isUser: true,
              timestamp: new Date(conv.createdAt),
            });
            
            // Add Ximi response
            historyMessages.push({
              id: `${conv.id}-ximi`,
              text: conv.ximiResponse,
              isUser: false,
              timestamp: new Date(conv.createdAt),
            });
          });
          
          // Update messages with history, keeping the initial greeting first
          setMessages(prev => [prev[0], ...historyMessages]);
        }
      } catch (error) {
        console.error('[Ximi Client] Exception while loading conversation history:', {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
          } : error,
          userAuthenticated: true,
        });
      }
    };

    loadConversationHistory();
    loadRecommendations();
  }, [userLocation, prioritizeNearby]);

  const requestUserLocation = () => {
    const cachedLocation = sessionStorage.getItem('userLocation');
    if (cachedLocation) {
      const { lat, lng } = JSON.parse(cachedLocation);
      setUserLocation({ lat, lng });
      setLocationPermission('granted');
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setLocationPermission('granted');
          sessionStorage.setItem('userLocation', JSON.stringify(location));
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationPermission('denied');
        }
      );
    }
  };

  // Load recommendations with optional location data
  const loadRecommendations = async () => {
    try {
      const requestData: {
        includeTrends: boolean;
        userLat?: number;
        userLng?: number;
        prioritizeNearby?: boolean;
      } = { includeTrends: true };

      if (prioritizeNearby && userLocation) {
        requestData.userLat = userLocation.lat;
        requestData.userLng = userLocation.lng;
        requestData.prioritizeNearby = true;
      }

      const { data, error } = await api.ximi.getRecommendations(requestData);
      
      if (error) {
        console.log('[Ximi Client] No recommendations available for XimiDock:', {
          timestamp: new Date().toISOString(),
          error: typeof error === 'string' ? error : error,
        });
        return;
      }

      if (data?.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        setHasNewRecommendations(true);
        console.log('[Ximi Client] Recommendations loaded for XimiDock:', {
          timestamp: new Date().toISOString(),
          count: data.recommendations.length,
          topRecommendation: data.recommendations[0]?.title,
          prioritizedByLocation: prioritizeNearby && !!userLocation,
        });
      }
    } catch (error) {
      console.error('[Ximi Client] Exception while loading recommendations for XimiDock:', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : error,
      });
    }
  };

  const handleAppendTranscript = (text: string) => {
    setInputText(prev => prev + text);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);

    try {
      // Call the real Ximi AI API
      const { data, error } = await api.ximi.chat({ message: messageText });
      
      if (error) {
        // Handle consent required error
        if (error === 'Ximi consent required') {
          console.log('[Ximi Client] Consent required, showing consent modal:', {
            timestamp: new Date().toISOString(),
            messageLength: messageText.length,
            hasPendingMessage: !!pendingMessage,
          });
          setPendingMessage(messageText);
          setShowConsentModal(true);
          setIsTyping(false);
          return;
        }
        
        // Handle other API errors
        console.error('[Ximi Client] Chat request failed in XimiDock:', {
          timestamp: new Date().toISOString(),
          messageLength: messageText.length,
          error: typeof error === 'string' ? error : error,
          userAuthenticated: true,
        });
        
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble processing that right now. Please try again, or feel free to explore the app on your own!",
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
        return;
      }
      
      // Clear pending message on successful send
      setPendingMessage(null);

      // Check if crisis was detected
      if (data.crisisDetected) {
        console.warn('[Ximi Client] Crisis detected in XimiDock, triggering crisis sheet:', {
          timestamp: new Date().toISOString(),
          messageLength: messageText.length,
          responseId: data.id,
        });
        
        const crisisResponse: Message = {
          id: data.id.toString(),
          text: data.ximiResponse,
          isUser: false,
          timestamp: new Date(data.createdAt),
        };
        
        setMessages(prev => [...prev, crisisResponse]);
        setIsTyping(false);
        
        // Trigger crisis support sheet
        setTimeout(() => {
          onCrisis();
        }, 1000);
        return;
      }

      // Add AI response to messages
      const aiResponse: Message = {
        id: data.id.toString(),
        text: data.ximiResponse,
        isUser: false,
        timestamp: new Date(data.createdAt),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

    } catch (error) {
      console.error('[Ximi Client] Exception during chat request in XimiDock:', {
        timestamp: new Date().toISOString(),
        messageLength: messageText.length,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : error,
        userAuthenticated: true,
      });
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble processing that right now. Please try again, or feel free to explore the app on your own!",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConsentGranted = async () => {
    setShowConsentModal(false);
    
    // Retry sending the pending message if there was one
    if (pendingMessage) {
      console.log('[Ximi Client] Consent granted, retrying pending message:', {
        timestamp: new Date().toISOString(),
        messageLength: pendingMessage.length,
      });
      
      setIsTyping(true);
      
      try {
        // Call the real Ximi AI API with the pending message
        const { data, error } = await api.ximi.chat({ message: pendingMessage });
        
        if (error) {
          // Handle API errors
          console.error('[Ximi Client] Chat request failed after consent grant:', {
            timestamp: new Date().toISOString(),
            messageLength: pendingMessage.length,
            error: typeof error === 'string' ? error : error,
            userAuthenticated: true,
          });
          
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: "I'm having trouble processing that right now. Please try again, or feel free to explore the app on your own!",
            isUser: false,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, errorResponse]);
          setIsTyping(false);
          setPendingMessage(null);
          return;
        }

        // Check if crisis was detected
        if (data.crisisDetected) {
          console.warn('[Ximi Client] Crisis detected after consent grant:', {
            timestamp: new Date().toISOString(),
            messageLength: pendingMessage.length,
            responseId: data.id,
          });
          
          const crisisResponse: Message = {
            id: data.id.toString(),
            text: data.ximiResponse,
            isUser: false,
            timestamp: new Date(data.createdAt),
          };
          
          setMessages(prev => [...prev, crisisResponse]);
          setIsTyping(false);
          setPendingMessage(null);
          
          // Trigger crisis support sheet
          setTimeout(() => {
            onCrisis();
          }, 1000);
          return;
        }

        // Add AI response to messages
        const aiResponse: Message = {
          id: data.id.toString(),
          text: data.ximiResponse,
          isUser: false,
          timestamp: new Date(data.createdAt),
        };
        
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
        setPendingMessage(null);

      } catch (error) {
        console.error('[Ximi Client] Exception during retry after consent grant:', {
          timestamp: new Date().toISOString(),
          messageLength: pendingMessage.length,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
          } : error,
          userAuthenticated: true,
        });
        
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble processing that right now. Please try again, or feel free to explore the app on your own!",
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
        setPendingMessage(null);
      }
    }
  };

  return (
    <>
      {/* Ximi Consent Modal */}
      <XimiConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsentGranted={handleConsentGranted}
      />

      {/* Floating Action Button */}
      <motion.button
        onClick={() => {
          setIsOpen(true);
          setHasNewRecommendations(false);
        }}
        className={`fixed bottom-24 right-4 w-14 h-14 bg-cosmic-gradient rounded-full shadow-cosmic flex items-center justify-center z-40 ${
          isOpen ? 'hidden' : ''
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 1 }}
        aria-label={hasNewRecommendations ? 'Open Ximi chat - New recommendations available' : 'Open Ximi chat'}
      >
        <MessageCircle className="w-6 h-6 text-deepSage" />
        
        {/* Recommendation Badge */}
        {hasNewRecommendations && recommendations.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md"
          >
            {recommendations.length > 9 ? '9+' : recommendations.length}
          </motion.div>
        )}
        
        {/* Floating particles around the button */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-teal rounded-full"
              style={{
                top: `${20 + (i * 20)}%`,
                left: `${20 + (i * 20)}%`,
              }}
              animate={{
                y: [-5, 5, -5],
                x: [-3, 3, -3],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + (i * 0.5),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
      </motion.button>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-navy/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Chat Panel */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl border-t border-borderMutedLight max-h-[80vh] flex flex-col"
              initial={{ transform: 'translateY(100%)' }}
              animate={{ transform: 'translateY(0)' }}
              exit={{ transform: 'translateY(100%)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Header */}
              <div className="border-b border-borderMutedLight">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cosmic-gradient rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-deepSage" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deepSage">Ximi</h3>
                      <p className="text-xs text-textSecondaryLight">AI Companion</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-textSecondaryLight" />
                  </button>
                </div>

                {/* Location Toggle */}
                {locationPermission === 'granted' && userLocation && (
                  <div className="px-4 pb-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-teal" />
                        <span className="text-sm text-deepSage font-medium">Prioritize nearby programs</span>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={prioritizeNearby}
                          onChange={(e) => setPrioritizeNearby(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-sage/20 rounded-full peer peer-checked:bg-teal transition-colors"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                    {prioritizeNearby && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-textSecondaryLight mt-2 flex items-start gap-1"
                      >
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-teal" />
                        <span>Helps show nearby programs. Location never stored.</span>
                      </motion.p>
                    )}
                  </div>
                )}

                {/* Location Permission Denied */}
                {locationPermission === 'denied' && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={requestUserLocation}
                      className="text-xs text-teal hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      Enable location for nearby programs
                    </button>
                  </div>
                )}
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-64 max-h-96">
                {/* Recommendations Section */}
                {recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <h3 className="font-display font-semibold text-deepSage text-base">
                        Programs Picked for You
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {recommendations.slice(0, 3).map((rec, index) => (
                        <motion.div
                          key={rec.eventId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                          <EventCard
                            event={{
                              eventId: rec.eventId,
                              eventName: rec.eventName || rec.programTitle,
                              description: rec.description,
                              dayOfWeek: rec.dayOfWeek || '',
                              startTime: rec.startTime || '',
                              endTime: rec.endTime || '',
                              isDropIn: rec.isDropIn || false,
                              locationName: rec.locationName,
                              address: rec.address,
                              distance: rec.distance ?? null,
                              ageMin: rec.ageMin,
                              ageMax: rec.ageMax,
                              cost: rec.cost,
                              costCents: rec.costCents ?? 0,
                              programId: rec.programId,
                              programTitle: rec.programTitle,
                              programDescription: rec.programDescription,
                              programTags: rec.tags,
                              organizer: rec.organizer,
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>
                    {recommendations.length > 3 && (
                      <p className="text-xs text-textSecondaryLight text-center italic mt-2">
                        Showing top 3 of {recommendations.length} recommendations
                      </p>
                    )}
                  </motion.div>
                )}
                
                {messages.map(message => (
                  <motion.div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start items-start gap-2'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        message.isUser
                          ? 'bg-teal text-white'
                          : 'bg-sage/10 text-deepSage'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                    {!message.isUser && (
                      <VoiceControls
                        mode="playback"
                        getTextToSpeak={() => message.text}
                        className="flex-shrink-0 mt-1"
                      />
                    )}
                  </motion.div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="bg-sage/10 text-deepSage px-4 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-sage rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Input */}
              <div className="p-4 border-t border-borderMutedLight">
                <div className="mb-3">
                  <VoiceControls
                    mode="input"
                    onAppendTranscript={handleAppendTranscript}
                    className="mb-2"
                  />
                </div>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className="flex-1 cosmic-input"
                    disabled={isTyping}
                  />
                  
                  <motion.button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isTyping}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      inputText.trim() && !isTyping
                        ? 'bg-teal text-white hover:bg-teal/90'
                        : 'bg-sage/10 text-sage/50 cursor-not-allowed'
                    }`}
                    whileHover={inputText.trim() && !isTyping ? { scale: 1.05 } : {}}
                    whileTap={inputText.trim() && !isTyping ? { scale: 0.95 } : {}}
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
                
                <p className="text-xs text-textSecondaryLight mt-2 text-center">
                  Ximi is your AI companion in Little Sibling mode
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
